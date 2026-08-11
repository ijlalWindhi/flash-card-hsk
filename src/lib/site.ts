/**
 * Where this app lives, and how to name it.
 *
 * Read through `import.meta.env` rather than `process.env` because these values
 * are needed inside `head()`, which runs in the browser as well as on the
 * server — and `process` does not exist there. Vite substitutes `VITE_`
 * variables at build time, so both bundles end up with a literal string.
 */
const FALLBACK_URL = "https://flash-card.dhisapro.com"

/** Absolute origin, never with a trailing slash — every join assumes that. */
export const SITE_URL = String(
  import.meta.env.VITE_SITE_URL || FALLBACK_URL
).replace(/\/+$/, "")

export const SITE_NAME = "Han.note"

export const SITE_LOCALE = "id_ID"

/** The Open Graph card, 1200×630. Regenerate with `npm run icons:build`. */
export const OG_IMAGE_PATH = "/og-image.png"

/**
 * Joins a route path onto the site origin.
 *
 * Takes the base as an argument so the behaviour can be tested without the
 * build-time constant getting in the way.
 */
export function absoluteUrl(path: string, base: string = SITE_URL): string {
  const origin = base.replace(/\/+$/, "")
  if (path === "/" || path === "") return `${origin}/`
  return `${origin}/${path.replace(/^\/+/, "")}`
}
