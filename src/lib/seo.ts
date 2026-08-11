import { OG_IMAGE_PATH, SITE_NAME, absoluteUrl } from "./site"
import type {
  DetailedHTMLProps,
  LinkHTMLAttributes,
  MetaHTMLAttributes,
} from "react"

/**
 * The per-page half of the document head.
 *
 * TanStack walks matched routes from the deepest outwards and keeps the first
 * `title` it sees, plus the first meta for any given `name`/`property`. That is
 * what lets the root supply a full set of fallbacks while every page overrides
 * the ones it cares about — no page has to repeat what it does not change.
 *
 * Links get no such treatment: they are concatenated, not deduplicated by
 * `rel`. A canonical emitted here *and* in the root would render twice and each
 * would contradict the other, so the root deliberately emits none.
 */
export type MetaTag = DetailedHTMLProps<
  MetaHTMLAttributes<HTMLMetaElement>,
  HTMLMetaElement
>

export type LinkTag = DetailedHTMLProps<
  LinkHTMLAttributes<HTMLLinkElement>,
  HTMLLinkElement
>

export type SeoInput = {
  /** Without the site name — this appends it. */
  title: string
  description: string
  /** Route path, e.g. `/quiz`. Used for both canonical and `og:url`. */
  path: string
  /**
   * Keeps the page out of search results.
   *
   * Also suppresses the canonical link: naming a preferred URL for a page that
   * asks not to be indexed sends a crawler two instructions that disagree.
   */
  noindex?: boolean
}

/** `Quiz HSK 4` → `Quiz HSK 4 · Han.note`, and never doubles the suffix. */
export function pageTitle(title: string): string {
  return title.endsWith(SITE_NAME) ? title : `${title} · ${SITE_NAME}`
}

export function seo(input: SeoInput): {
  meta: Array<MetaTag>
  links: Array<LinkTag>
} {
  const url = absoluteUrl(input.path)
  const title = pageTitle(input.title)
  const image = absoluteUrl(OG_IMAGE_PATH)

  const meta: Array<MetaTag> = [
    { title },
    { name: "description", content: input.description },
    {
      name: "robots",
      content: input.noindex ? "noindex, nofollow" : "index, follow",
    },
    { property: "og:title", content: title },
    { property: "og:description", content: input.description },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: input.description },
    { name: "twitter:image", content: image },
  ]

  return {
    meta,
    links: input.noindex ? [] : [{ rel: "canonical", href: url }],
  }
}

/**
 * The structured description of the app, for the home page only.
 *
 * Every claim here is checkable against the page itself. Structured data that
 * overstates what a page offers is a reason to be penalised, not ranked.
 */
export function webApplicationJsonLd(description: string): MetaTag {
  /*
    Cast because the two halves of the library disagree. TanStack's renderer
    looks for a `script:ld+json` key on a meta entry and emits a JSON-LD script
    tag for it, but `head()` types its `meta` array as real `<meta>` attributes,
    which that key is not. The cast is confined here so no route has to repeat
    it — and `webApplicationJsonLd.test.ts` checks the object still serialises.
  */
  return {
    "script:ld+json": {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: SITE_NAME,
      url: absoluteUrl("/"),
      description,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      inLanguage: "id",
      isAccessibleForFree: true,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "IDR",
      },
    },
  } as unknown as MetaTag
}
