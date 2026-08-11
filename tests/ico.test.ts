// @vitest-environment node
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { buildIco } from "../scripts/ico"

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
])

/** Stands in for a real PNG: only the signature is ever inspected. */
function fakePng(fill: number, length = 40): Buffer {
  return Buffer.concat([PNG_SIGNATURE, Buffer.alloc(length, fill)])
}

describe("buildIco", () => {
  it("writes an icon header naming every image", () => {
    const ico = buildIco([
      { size: 16, data: fakePng(1) },
      { size: 32, data: fakePng(2) },
      { size: 48, data: fakePng(3) },
    ])

    expect(ico.readUInt16LE(0)).toBe(0) // reserved
    expect(ico.readUInt16LE(2)).toBe(1) // 1 = icon
    expect(ico.readUInt16LE(4)).toBe(3)
  })

  it("records each declared size", () => {
    const ico = buildIco([
      { size: 16, data: fakePng(1) },
      { size: 48, data: fakePng(2) },
    ])

    expect(ico.readUInt8(6)).toBe(16)
    expect(ico.readUInt8(7)).toBe(16)
    expect(ico.readUInt8(6 + 16)).toBe(48)
  })

  it("spells 256 as zero, the only value that byte cannot hold", () => {
    const ico = buildIco([{ size: 256, data: fakePng(1) }])

    expect(ico.readUInt8(6)).toBe(0)
    expect(ico.readUInt8(7)).toBe(0)
  })

  it("points every offset at the start of its own image", () => {
    const images = [
      { size: 16, data: fakePng(1, 10) },
      { size: 32, data: fakePng(2, 20) },
      { size: 48, data: fakePng(3, 30) },
    ]
    const ico = buildIco(images)

    images.forEach((image, index) => {
      const entry = 6 + index * 16
      const length = ico.readUInt32LE(entry + 8)
      const offset = ico.readUInt32LE(entry + 12)

      expect(length).toBe(image.data.length)
      // The bytes actually sitting there must be the image that was handed in.
      expect(ico.subarray(offset, offset + length).equals(image.data)).toBe(
        true
      )
      expect(
        ico
          .subarray(offset, offset + PNG_SIGNATURE.length)
          .equals(PNG_SIGNATURE)
      ).toBe(true)
    })
  })

  it("is exactly the header, the directory and the images", () => {
    const images = [
      { size: 16, data: fakePng(1, 10) },
      { size: 32, data: fakePng(2, 20) },
    ]

    expect(buildIco(images)).toHaveLength(
      6 + 16 * 2 + images.reduce((sum, i) => sum + i.data.length, 0)
    )
  })

  it("refuses sizes the format cannot express", () => {
    expect(() => buildIco([{ size: 257, data: fakePng(1) }])).toThrow(/1–256/)
    expect(() => buildIco([{ size: 0, data: fakePng(1) }])).toThrow(/1–256/)
  })

  it("refuses an empty icon", () => {
    expect(() => buildIco([])).toThrow(/at least one/)
  })
})

describe("the committed favicon.ico", () => {
  /*
    The build script is not run on deploy, so the file in `public/` is the one
    that ships. This checks the committed artefact itself rather than trusting
    that whoever last edited the art also remembered to regenerate it.
  */
  const ico = readFileSync(resolve(process.cwd(), "public/favicon.ico"))

  it("carries the three sizes browsers ask for", () => {
    expect(ico.readUInt16LE(4)).toBe(3)
    const sizes = [0, 1, 2].map((index) => ico.readUInt8(6 + index * 16))
    expect(sizes).toEqual([16, 32, 48])
  })

  it("embeds real PNGs at the offsets it declares", () => {
    for (let index = 0; index < 3; index += 1) {
      const offset = ico.readUInt32LE(6 + index * 16 + 12)
      expect(
        ico
          .subarray(offset, offset + PNG_SIGNATURE.length)
          .equals(PNG_SIGNATURE)
      ).toBe(true)
    }
  })
})
