import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { nitro } from "nitro/vite"

const config = defineConfig({
  resolve: { tsconfigPaths: true },
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
