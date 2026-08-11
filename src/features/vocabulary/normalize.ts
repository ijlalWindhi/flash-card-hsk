import type { VocabularyItem } from "./types"

/**
 * Combining marks that carry pinyin tone, and nothing else.
 *
 * The diaeresis (U+0308) is deliberately absent: in pinyin it distinguishes
 * `lü` from `lu`, so stripping every `\p{Diacritic}` would fold two different
 * syllables together.
 */
const TONE_MARKS = /[\u0300\u0301\u0304\u0306\u030C]/g

/**
 * Collapses a pinyin string to a comparable key: lowercase, no spaces, no tone
 * marks. Used for sorting the vocabulary list and for matching search input
 * typed without diacritics.
 */
export function normalizePinyin(value: string): string {
  return value
    .normalize("NFD")
    .replace(TONE_MARKS, "")
    .normalize("NFC")
    .toLocaleLowerCase("en")
    .replace(/\s+/g, "")
}

/**
 * Folds Latin-script meaning text for comparison. Unlike pinyin, spaces are
 * meaningful here — "kata kerja" should not match "katakerja" — so runs of
 * whitespace are collapsed rather than removed.
 */
export function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase("en").replace(/\s+/g, " ")
}

/**
 * Filters the list against one query that may be Hanzi, pinyin with or without
 * tone marks, an Indonesian meaning, or an English meaning.
 *
 * Returns a new array; a blank query returns every item.
 */
export function searchVocabulary(
  items: Array<VocabularyItem>,
  query: string
): Array<VocabularyItem> {
  const text = normalizeSearchText(query)
  if (!text) return [...items]

  const pinyinQuery = normalizePinyin(query)

  return items.filter(
    (item) =>
      item.hanzi.includes(query.trim()) ||
      item.pinyinSortKey.includes(pinyinQuery) ||
      normalizePinyin(item.pinyin).includes(pinyinQuery) ||
      normalizeSearchText(item.translationId).includes(text) ||
      normalizeSearchText(item.translationEn).includes(text)
  )
}
