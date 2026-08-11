import { describe, expect, it } from "vitest"
import { normalizePinyin } from "./normalize"

describe("normalizePinyin", () => {
  it("ignores case, spaces and tone marks", () => {
    expect(normalizePinyin(" Ān Pái ")).toBe("anpai")
    expect(normalizePinyin("lǜ")).toBe("lü")
  })
})
