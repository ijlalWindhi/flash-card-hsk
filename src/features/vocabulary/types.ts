/**
 * A word as the browser sees it.
 *
 * Deliberately narrower than the database record: timestamps and source
 * metadata stay on the server, so a route loader can serialize this straight
 * into the page without leaking anything the learner has no use for.
 */
export type VocabularyItem = {
  id: string
  hanzi: string
  pinyin: string
  /** Tone-free, lowercase pinyin — the list's sort key and a search key. */
  pinyinSortKey: string
  translationId: string
  translationEn: string
  kind: "official" | "manual"
}
