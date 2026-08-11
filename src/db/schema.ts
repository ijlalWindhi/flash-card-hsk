import { sql } from "drizzle-orm"
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

/**
 * One studiable word.
 *
 * `official` rows come from `data/hsk4-3.0.csv` and keep the provenance of the
 * syllabus they were sourced from. `manual` rows are created by the
 * administrator and carry no source metadata.
 */
export const vocabulary = sqliteTable(
  "vocabulary",
  {
    id: text("id").primaryKey(),
    /** Stable ID from the seed file (`hsk3-4-0001`); null for manual entries. */
    externalId: text("external_id").unique(),
    hanzi: text("hanzi").notNull(),
    pinyin: text("pinyin").notNull(),
    /** `normalizePinyin(pinyin)` — the list's sort key and search key. */
    pinyinSortKey: text("pinyin_sort_key").notNull(),
    translationId: text("translation_id").notNull(),
    translationEn: text("translation_en").notNull(),
    kind: text("kind", { enum: ["official", "manual"] }).notNull(),
    sourceName: text("source_name"),
    sourceUrl: text("source_url"),
    sourceVersion: text("source_version"),
    verifiedAt: text("verified_at"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    /**
     * Guards the administrator against creating the same word twice.
     *
     * Scoped to manual entries because the syllabus itself lists 批 pī twice —
     * once as a verb, once as a classifier — so a global constraint would
     * reject one of the 1,000 official rows. Official rows are already unique
     * through `external_id`. See data/README.md.
     */
    uniqueIndex("vocabulary_manual_hanzi_pinyin_unique")
      .on(table.hanzi, table.pinyin)
      .where(sql`${table.kind} = 'manual'`),
  ]
)

export type VocabularyRecord = typeof vocabulary.$inferSelect
export type NewVocabularyRecord = typeof vocabulary.$inferInsert
