import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { nitro } from "nitro/vite"

/**
 * Packages Nitro must not bundle.
 *
 * `firebase-admin` pulls in `@google-cloud/firestore`, which is CommonJS and
 * locates its gRPC `.proto` files through `__dirname` at runtime. Bundled into
 * an ESM server that identifier does not exist, and every render that touches
 * the module dies with "__dirname is not defined in ES module scope" — which
 * took down every SSR route, not just the ones using accounts.
 *
 * Left external, Node loads it from `node_modules` as the CommonJS package it
 * is, and its own file lookups resolve. Nitro traces it into the output.
 */
const SERVER_EXTERNALS = [/^firebase-admin(\/|$)/]

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  nitro: {
    rollupConfig: { external: SERVER_EXTERNALS },
    traceDeps: ["firebase-admin*"],
  },
  /**
   * `nitro()` is what makes this deployable.
   *
   * On its own, TanStack Start emits `dist/client` and `dist/server`, which a
   * host has to be told how to serve — upload that as-is and Vercel treats the
   * whole thing as static files and answers 404, because there is no
   * `index.html` at the root and no function to render one.
   *
   * Nitro detects the platform at build time and writes Vercel's Build Output
   * API tree (`.vercel/output`) with a real serverless function, which is also
   * what server functions need in order to exist at runtime.
   */
  plugins: [devtools(), tailwindcss(), tanstackStart(), nitro(), viteReact()],
})

export default config
