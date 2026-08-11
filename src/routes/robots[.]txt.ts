import { createFileRoute } from "@tanstack/react-router"
import { buildRobotsTxt } from "@/lib/sitemap"

/**
 * robots.txt, built from the same `SITE_URL` as the sitemap it points at.
 *
 * This replaces the static `public/robots.txt`, which listed no sitemap at all
 * and would have had to repeat the domain by hand.
 */
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(buildRobotsTxt(), {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        }),
    },
  },
})
