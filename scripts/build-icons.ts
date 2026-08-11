/**
 * Renders every icon the app serves, from the vector source in `icon-art.ts`.
 *
 *   npm run icons:build
 *
 * The output is committed. A deploy never runs this, which is what keeps a
 * native rasteriser out of the production build — and means the icons cannot
 * change because a machine somewhere had a different font installed.
 */
import { writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { Resvg } from "@resvg/resvg-js"
import { markSvg, ogImageSvg } from "./icon-art"
import { buildIco } from "./ico"

const PUBLIC_DIR = resolve(import.meta.dirname, "../public")

/**
 * Rasterises at an exact pixel width.
 *
 * `loadSystemFonts` is off for the mark: it has no text, and leaving it on
 * makes every call scan the system font directories for nothing.
 */
function render(svg: string, width: number, withFonts = false): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { loadSystemFonts: withFonts },
  })
  return Buffer.from(resvg.render().asPng())
}

async function write(name: string, data: Buffer | string): Promise<void> {
  await writeFile(resolve(PUBLIC_DIR, name), data)
  const size = typeof data === "string" ? Buffer.byteLength(data) : data.length
  process.stdout.write(`  ${name.padEnd(24)} ${String(size).padStart(7)} B\n`)
}

async function main(): Promise<void> {
  process.stdout.write("icons →\n")

  // The scalable one modern browsers prefer over anything in the .ico.
  await write("favicon.svg", markSvg())

  /*
    Three sizes in the .ico, and the smallest is a different drawing.
    16px cannot hold the outlined card behind — see `markBodySmall`.
  */
  await write(
    "favicon.ico",
    buildIco([
      { size: 16, data: render(markSvg({ small: true }), 16) },
      { size: 32, data: render(markSvg(), 32) },
      { size: 48, data: render(markSvg(), 48) },
    ])
  )

  await write("icon-192.png", render(markSvg(), 192))
  await write("icon-512.png", render(markSvg(), 512))

  // Square: iOS rounds it itself, and rounding it twice shows the backdrop
  // through four notches at the corners.
  await write("apple-touch-icon.png", render(markSvg({ rounded: false }), 180))

  // The only one with text, so the only one that needs fonts.
  await write("og-image.png", render(ogImageSvg(), 1200, true))
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`
  )
  process.exitCode = 1
})
