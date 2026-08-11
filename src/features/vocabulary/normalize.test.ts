import { describe, expect, it } from "vitest"
import type { VocabularyItem } from "./types"
import {
  normalizePinyin,
  normalizeSearchText,
  searchVocabulary,
} from "./normalize"

function item(
  overrides: Partial<VocabularyItem> & { id: string }
): VocabularyItem {
  return {
    hanzi: "安排",
    pinyin: "ānpái",
    pinyinSortKey: "anpai",
    translationId: "mengatur;merencanakan",
    translationEn: "to arrange;to plan",
    kind: "official",
    ...overrides,
  }
}

const items: Array<VocabularyItem> = [
  item({ id: "a" }),
  item({
    id: "b",
    hanzi: "绿",
    pinyin: "lǜ",
    pinyinSortKey: "lü",
    translationId: "hijau",
    translationEn: "green",
  }),
  item({
    id: "c",
    hanzi: "会议",
    pinyin: "huìyì",
    pinyinSortKey: "huiyi",
    translationId: "rapat;pertemuan",
    translationEn: "meeting;conference",
  }),
]

describe("normalizePinyin", () => {
  it("ignores case, spaces and tone marks", () => {
    expect(normalizePinyin(" Ān Pái ")).toBe("anpai")
    expect(normalizePinyin("lǜ")).toBe("lü")
  })
})

describe("normalizeSearchText", () => {
  it("folds case and collapses whitespace", () => {
    expect(normalizeSearchText("  Mengatur   Jadwal ")).toBe("mengatur jadwal")
  })
})

describe("searchVocabulary", () => {
  it("finds by Hanzi, unaccented pinyin, Indonesian and English", () => {
    expect(searchVocabulary(items, "anpai")).toEqual([items[0]])
    expect(searchVocabulary(items, "安排")).toEqual([items[0]])
    expect(searchVocabulary(items, "mengatur")).toEqual([items[0]])
    expect(searchVocabulary(items, "arrange")).toEqual([items[0]])
  })

  it("matches tone-marked pinyin typed with its diacritics", () => {
    expect(searchVocabulary(items, "huìyì")).toEqual([items[2]])
  })

  it("returns every item for a blank query, without mutating the input", () => {
    const original = [...items]
    expect(searchVocabulary(items, "   ")).toEqual(items)
    expect(items).toEqual(original)
  })

  it("returns nothing when no field matches", () => {
    expect(searchVocabulary(items, "zzzz")).toEqual([])
  })
})
