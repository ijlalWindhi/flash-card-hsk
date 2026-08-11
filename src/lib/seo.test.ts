import { describe, expect, it } from "vitest"
import { pageTitle, seo, webApplicationJsonLd } from "./seo"
import { SITE_URL, absoluteUrl } from "./site"
import type { MetaTag } from "./seo"

function named(meta: Array<MetaTag>, name: string): string | undefined {
  return meta.find((tag) => tag.name === name)?.content
}

function property(meta: Array<MetaTag>, key: string): string | undefined {
  return meta.find((tag) => tag.property === key)?.content
}

function title(meta: Array<MetaTag>): string | undefined {
  return meta.find((tag) => tag.title !== undefined)?.title
}

/** Reads the JSON-LD payload back out from behind the cast in `seo.ts`. */
function jsonLd(tag: MetaTag): Record<string, unknown> {
  return (tag as unknown as Record<string, Record<string, unknown>>)[
    "script:ld+json"
  ]
}

describe("absoluteUrl", () => {
  it("keeps the root path as a single trailing slash", () => {
    expect(absoluteUrl("/", "https://example.com")).toBe("https://example.com/")
  })

  it("joins a path without doubling the separator", () => {
    expect(absoluteUrl("/quiz", "https://example.com")).toBe(
      "https://example.com/quiz"
    )
    expect(absoluteUrl("quiz", "https://example.com/")).toBe(
      "https://example.com/quiz"
    )
  })

  it("strips a trailing slash from the base", () => {
    expect(absoluteUrl("/about", "https://example.com///")).toBe(
      "https://example.com/about"
    )
  })
})

describe("pageTitle", () => {
  it("appends the site name", () => {
    expect(pageTitle("Quiz HSK 4")).toBe("Quiz HSK 4 · Han.note")
  })

  it("does not append it twice", () => {
    expect(pageTitle("Quiz HSK 4 · Han.note")).toBe("Quiz HSK 4 · Han.note")
  })
})

describe("seo", () => {
  const input = {
    title: "Quiz HSK 4",
    description: "Uji hafalan kosa kata HSK 4.",
    path: "/quiz",
  }

  it("titles the page and mirrors it into both card formats", () => {
    const { meta } = seo(input)
    const expected = "Quiz HSK 4 · Han.note"

    expect(title(meta)).toBe(expected)
    expect(property(meta, "og:title")).toBe(expected)
    expect(named(meta, "twitter:title")).toBe(expected)
  })

  it("mirrors the description into both card formats", () => {
    const { meta } = seo(input)

    expect(named(meta, "description")).toBe(input.description)
    expect(property(meta, "og:description")).toBe(input.description)
    expect(named(meta, "twitter:description")).toBe(input.description)
  })

  it("points og:url and canonical at the same absolute address", () => {
    const { meta, links } = seo(input)
    const url = `${SITE_URL}/quiz`

    expect(property(meta, "og:url")).toBe(url)
    expect(links).toEqual([{ rel: "canonical", href: url }])
  })

  it("uses an absolute image URL, which the card formats require", () => {
    const { meta } = seo(input)

    expect(property(meta, "og:image")).toMatch(/^https?:\/\//)
    expect(named(meta, "twitter:image")).toBe(property(meta, "og:image"))
  })

  it("invites indexing by default", () => {
    expect(named(seo(input).meta, "robots")).toBe("index, follow")
  })

  it("drops the canonical when the page asks not to be indexed", () => {
    const { meta, links } = seo({ ...input, noindex: true })

    expect(named(meta, "robots")).toBe("noindex, nofollow")
    // A canonical names a preferred URL to index; saying that while asking not
    // to be indexed hands a crawler two instructions that contradict.
    expect(links).toEqual([])
  })
})

describe("webApplicationJsonLd", () => {
  it("describes the app truthfully and in the page's language", () => {
    const data = jsonLd(webApplicationJsonLd("Belajar kosa kata HSK 4."))

    expect(data["@type"]).toBe("WebApplication")
    expect(data.inLanguage).toBe("id")
    expect(data.isAccessibleForFree).toBe(true)
    expect(data.url).toBe(`${SITE_URL}/`)
  })

  it("survives JSON serialisation, which is how it reaches the page", () => {
    const data = jsonLd(webApplicationJsonLd("Belajar kosa kata HSK 4."))
    expect(() => JSON.stringify(data)).not.toThrow()
    expect(JSON.parse(JSON.stringify(data))).toEqual(data)
  })
})
