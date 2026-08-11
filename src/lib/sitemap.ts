import { SITE_URL, absoluteUrl } from "./site"

export type SitemapEntry = {
  path: string
  /** Relative weight within this site only; it says nothing to other sites. */
  priority: number
  changefreq: "daily" | "weekly" | "monthly" | "yearly"
}

/**
 * Every page a crawler should know about.
 *
 * The single source of truth for the sitemap, and the list a test checks the
 * route tree against — a new public route that nobody adds here fails the suite
 * rather than quietly going unlisted.
 *
 * `/admin` and `/admin/login` are absent on purpose: they are `noindex`, and
 * listing a page in a sitemap while asking robots to skip it is a contradiction.
 */
export const SITEMAP_ROUTES: Array<SitemapEntry> = [
  { path: "/", priority: 1.0, changefreq: "weekly" },
  { path: "/study", priority: 0.9, changefreq: "monthly" },
  { path: "/quiz", priority: 0.9, changefreq: "monthly" },
  { path: "/about", priority: 0.5, changefreq: "yearly" },
  { path: "/masuk", priority: 0.3, changefreq: "yearly" },
  { path: "/daftar", priority: 0.3, changefreq: "yearly" },
]

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

/**
 * Renders the sitemap.
 *
 * No `<lastmod>`: the only date available at build time is the build's own, and
 * stamping it on pages that did not change is precisely the kind of claim
 * crawlers learn to distrust. Better to say nothing than to say something false.
 */
export function buildSitemapXml(
  routes: Array<SitemapEntry> = SITEMAP_ROUTES,
  base: string = SITE_URL
): string {
  const entries = routes
    .map((route) => {
      const loc = escapeXml(absoluteUrl(route.path, base))
      return [
        "  <url>",
        `    <loc>${loc}</loc>`,
        `    <changefreq>${route.changefreq}</changefreq>`,
        `    <priority>${route.priority.toFixed(1)}</priority>`,
        "  </url>",
      ].join("\n")
    })
    .join("\n")

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    "</urlset>",
    "",
  ].join("\n")
}

/**
 * Renders robots.txt.
 *
 * Served from a route rather than `public/` so the sitemap URL cannot drift out
 * of step with `SITE_URL` — a stale absolute address here points crawlers at a
 * domain that may no longer answer.
 */
export function buildRobotsTxt(base: string = SITE_URL): string {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "",
    `Sitemap: ${absoluteUrl("/sitemap.xml", base)}`,
    "",
  ].join("\n")
}
