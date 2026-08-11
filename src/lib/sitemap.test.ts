import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { SITEMAP_ROUTES, buildRobotsTxt, buildSitemapXml } from "./sitemap"

const BASE = "https://example.com"

describe("buildSitemapXml", () => {
  it("declares the XML prolog and the sitemap namespace", () => {
    const xml = buildSitemapXml(SITEMAP_ROUTES, BASE)

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    )
    expect(xml.trimEnd().endsWith("</urlset>")).toBe(true)
  })

  it("emits one absolute <loc> per route", () => {
    const xml = buildSitemapXml(SITEMAP_ROUTES, BASE)
    const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(
      (match) => match[1]
    )

    expect(locs).toHaveLength(SITEMAP_ROUTES.length)
    expect(locs.every((loc) => loc.startsWith(`${BASE}/`))).toBe(true)
    expect(locs).toContain(`${BASE}/`)
    expect(locs).toContain(`${BASE}/quiz`)
  })

  it("never lists a page that asks robots to skip it", () => {
    expect(buildSitemapXml(SITEMAP_ROUTES, BASE)).not.toContain("/admin")
  })

  it("escapes characters that would otherwise break the document", () => {
    const xml = buildSitemapXml(
      [{ path: "/cari?q=a&b", priority: 0.5, changefreq: "weekly" }],
      BASE
    )

    expect(xml).toContain("<loc>https://example.com/cari?q=a&amp;b</loc>")
    expect(xml).not.toContain("&b<")
  })

  it("omits lastmod rather than stamping a date it cannot know", () => {
    expect(buildSitemapXml(SITEMAP_ROUTES, BASE)).not.toContain("<lastmod>")
  })
})

describe("buildRobotsTxt", () => {
  it("points crawlers at an absolute sitemap URL", () => {
    expect(buildRobotsTxt(BASE)).toContain(`Sitemap: ${BASE}/sitemap.xml`)
  })

  it("allows the public site and holds back the admin screens", () => {
    const robots = buildRobotsTxt(BASE)

    expect(robots).toContain("User-agent: *")
    expect(robots).toContain("Allow: /")
    expect(robots).toContain("Disallow: /admin")
  })
})

/**
 * The sitemap has no way to notice a page that was added and never listed, so
 * this compares it against the routes TanStack actually generated.
 *
 * The generated file is read as text rather than imported: importing it pulls
 * in every route module, and with them the server functions those modules
 * reference — far more than a list of paths is worth.
 */
describe("sitemap coverage", () => {
  /** Endpoints that answer with something other than a page. */
  const NON_PAGE_ROUTES = new Set(["/sitemap.xml", "/robots.txt"])

  function generatedRoutePaths(): Array<string> {
    // Resolved from the working directory, not `import.meta.url`: the jsdom
    // environment hands modules an http: URL, which `fileURLToPath` rejects.
    const source = readFileSync(
      resolve(process.cwd(), "src/routeTree.gen.ts"),
      "utf8"
    )
    const block = source.match(
      /export interface FileRoutesByFullPath \{([\s\S]*?)\n\}/
    )
    if (!block) throw new Error("FileRoutesByFullPath not found in route tree")

    return (
      [...block[1].matchAll(/'([^']+)':/g)]
        .map((match) => match[1])
        // An index child renders at its parent's path: '/admin/' is '/admin'.
        .map((path) => (path.length > 1 ? path.replace(/\/$/, "") : path))
    )
  }

  it("lists every public page exactly once", () => {
    const expected = generatedRoutePaths()
      .filter((path) => !path.startsWith("/admin"))
      .filter((path) => !NON_PAGE_ROUTES.has(path))
      .sort()

    const listed = SITEMAP_ROUTES.map((route) => route.path).sort()

    expect(listed).toEqual(expected)
  })

  it("gives every entry a priority within the allowed range", () => {
    for (const route of SITEMAP_ROUTES) {
      expect(route.priority).toBeGreaterThanOrEqual(0)
      expect(route.priority).toBeLessThanOrEqual(1)
    }
  })
})
