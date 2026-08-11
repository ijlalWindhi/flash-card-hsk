import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { nitro } from "nitro/vite"

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  nitro: {
    /**
     * Keep `firebase-admin` out of the bundle and copy it into the output.
     *
     * It pulls in `@google-cloud/firestore`, a CommonJS package that finds its
     * gRPC `.proto` files through `__dirname`. Bundled into an ESM server that
     * identifier does not exist, so the module threw "__dirname is not defined
     * in ES module scope" — and because the root route loads the session, that
     * took down *every* SSR route, not only the ones using accounts. Vite
     * leaves node_modules external in development, which is why this appeared
     * only once deployed.
     *
     * `traceDeps` is the knob that both externalises the package and traces it
     * — with its `.proto` files — into the server output. Marking it external
     * through `rollupConfig` instead stops the bundling but skips the tracing,
     * which trades the crash for a missing module.
     */
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
