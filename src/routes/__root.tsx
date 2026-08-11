import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"

import { AccountNav } from "@/components/account-nav"
import { getCurrentUserFn } from "@/features/accounts/auth.functions"
import { pageTitle } from "@/lib/seo"
import { SITE_LOCALE, SITE_NAME, absoluteUrl, OG_IMAGE_PATH } from "@/lib/site"
import appCss from "../styles.css?url"

export const Route = createRootRoute({
  /**
   * Who is signed in, resolved once for every page.
   *
   * The header needs it everywhere, and the quiz needs it to decide whether a
   * result can be saved. Returns null for a guest rather than failing, so the
   * app still renders with no Firebase credentials configured.
   */
  loader: () => getCurrentUserFn(),
  /**
   * The head every page shares.
   *
   * Only site-wide invariants and fallbacks belong here. TanStack walks matched
   * routes deepest-first and keeps the first `title` plus the first meta for any
   * given `name`/`property`, so anything a page sets through `seo()` wins over
   * what is written below — and a page that sets nothing still gets a sensible
   * title, description and card.
   *
   * There is deliberately no canonical link. Links are concatenated rather than
   * deduplicated by `rel`, so one here would render alongside every page's own
   * and the two would name different URLs for the same document.
   */
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: pageTitle("Kosa Kata HSK 4") },
      {
        name: "description",
        content:
          "Hafalkan 1.000 kata yang diperkenalkan di HSK 3.0 tingkat 4, dengan arti Indonesia dan Inggris.",
      },
      { name: "theme-color", content: "#faf9f7" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:locale", content: SITE_LOCALE },
      { property: "og:type", content: "website" },
      { property: "og:image", content: absoluteUrl(OG_IMAGE_PATH) },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // SVG first for browsers that take it; the .ico stays for those that do
      // not, and for the bookmark and taskbar surfaces that still read it.
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.json" },
    ],
  }),
  notFoundComponent: () => (
    <main className="mx-auto w-full max-w-3xl px-5 py-24">
      <p className="eyebrow text-mark">404</p>
      <h1 className="mt-2 text-2xl font-medium">Halaman tidak ditemukan</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Tautan yang kamu buka tidak ada di aplikasi ini.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block text-sm underline underline-offset-4"
      >
        Kembali ke daftar kosa kata
      </Link>
    </main>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-svh flex-col">
        <header className="border-b border-border">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-4">
            <Link to="/" className="eyebrow no-underline">
              Han<span className="text-mark">.</span>note
            </Link>
            <nav className="flex items-center gap-5 text-xs text-muted-foreground">
              <span className="hidden sm:inline">HSK 3.0 · tingkat 4</span>
              <Link to="/about" className="underline-offset-4 hover:underline">
                Tentang
              </Link>
              <AccountNav />
            </nav>
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <footer className="border-t border-border">
          <div className="mx-auto w-full max-w-5xl px-5 py-5 text-xs leading-relaxed text-muted-foreground">
            Daftar kata dari silabus HSK 3.0 terbitan terbaru. Arti dari
            CC-CEDICT dan CC-CIDICT, CC BY-SA 4.0.{" "}
            <Link to="/about" className="underline underline-offset-4">
              Sumber dan atribusi
            </Link>
            .
          </div>
        </footer>

        <TanStackDevtools
          config={{ position: "bottom-right" }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
