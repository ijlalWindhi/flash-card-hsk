/**
 * Packs PNGs into a Windows ICO container.
 *
 * Hand-written rather than pulled from a package because the format is a
 * six-byte header, a sixteen-byte record per image, and then the PNG files
 * themselves — less code than the dependency's own type declarations.
 *
 * Embedding PNG rather than the older BMP-with-mask form is what every browser
 * released this century reads, and it keeps the file a fraction of the size.
 */
export type IcoImage = { size: number; data: Buffer }

const HEADER_BYTES = 6
const ENTRY_BYTES = 16

export function buildIco(images: Array<IcoImage>): Buffer {
  if (images.length === 0) throw new Error("an ICO needs at least one image")

  for (const image of images) {
    // 256 is stored as 0, so anything larger has nowhere to go in one byte.
    if (image.size < 1 || image.size > 256) {
      throw new Error(`ICO entries must be 1–256px, got ${image.size}`)
    }
  }

  const header = Buffer.alloc(HEADER_BYTES)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // 1 = icon, 2 = cursor
  header.writeUInt16LE(images.length, 4)

  const directory = Buffer.alloc(ENTRY_BYTES * images.length)
  let offset = HEADER_BYTES + directory.length

  images.forEach((image, index) => {
    const at = index * ENTRY_BYTES
    // 256 does not fit in a byte and is spelled 0 by the specification.
    directory.writeUInt8(image.size === 256 ? 0 : image.size, at)
    directory.writeUInt8(image.size === 256 ? 0 : image.size, at + 1)
    directory.writeUInt8(0, at + 2) // palette size; 0 for truecolour
    directory.writeUInt8(0, at + 3) // reserved
    directory.writeUInt16LE(1, at + 4) // colour planes
    directory.writeUInt16LE(32, at + 6) // bits per pixel
    directory.writeUInt32LE(image.data.length, at + 8)
    directory.writeUInt32LE(offset, at + 12)
    offset += image.data.length
  })

  return Buffer.concat([header, directory, ...images.map((i) => i.data)])
}
