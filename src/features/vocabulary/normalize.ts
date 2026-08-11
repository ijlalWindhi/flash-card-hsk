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
