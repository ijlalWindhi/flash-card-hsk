import { createFileRoute } from "@tanstack/react-router"
import { buildSitemapXml } from "@/lib/sitemap"

/**
 * The sitemap, rendered per request rather than committed to `public/`.
 *
 * `<loc>` has to be absolute, which means a static file would bake the domain
 * in at authoring time and keep serving it after the site moved. Building it
 * from `SITE_URL` means the two can never disagree.
 *
 * The brackets in the filename escape the dot: TanStack reads `.` as a path
 * separator, so `sitemap.xml.ts` would route to `/sitemap/xml`.
 */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () =>
        new Response(buildSitemapXml(), {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            // Crawlers refetch this often and it changes about never.
            "Cache-Control": "public, max-age=3600",
          },
        }),
    },
  },
})
