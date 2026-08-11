import { randomUUID } from "node:crypto"
import { asc, count, eq } from "drizzle-orm"
import { getDatabase } from "@/db/client.server"
import type { VocabularyDatabase } from "@/db/client.server"
import type { NewVocabularyRecord, VocabularyRecord } from "@/db/schema"
import { vocabulary } from "@/db/schema"
import type { VocabularyCsvRow } from "../../../scripts/validate-hsk4-dataset"
import { normalizePinyin } from "./normalize"
import type { VocabularyItem } from "./types"

export type ManualVocabularyInput = {
  hanzi: string
  pinyin: string
  translationId: string
  translationEn: string
}

export type SeedReport = { inserted: number; skipped: number }

/** Official IDs are derived from the seed file so a reseed is a no-op. */
function officialId(externalId: string): string {
  return `official:${externalId}`
}

function toOfficialRecord(
  row: VocabularyCsvRow,
  now: Date
): NewVocabularyRecord {
  return {
    id: officialId(row.external_id),
    externalId: row.external_id,
    hanzi: row.hanzi,
    pinyin: row.pinyin,
    pinyinSortKey: normalizePinyin(row.pinyin),
    translationId: row.translation_id,
    translationEn: row.translation_en,
    kind: "official",
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    sourceVersion: row.source_version,
    verifiedAt: row.verified_at,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Imports official CSV rows, leaving anything already stored untouched.
 *
 * Idempotent by design: a conflict on `external_id` is skipped rather than
 * overwritten, so administrator edits to an official row and every manual row
 * survive a reseed.
 */
export async function seedOfficialVocabulary(
  db: VocabularyDatabase,
  rows: Array<VocabularyCsvRow>
): Promise<SeedReport> {
  const now = new Date()
  let inserted = 0

  for (const row of rows) {
    const result = await db
      .insert(vocabulary)
      .values(toOfficialRecord(row, now))
      .onConflictDoNothing({ target: vocabulary.externalId })

    if (result.rowsAffected > 0) inserted += 1
  }

  return { inserted, skipped: rows.length - inserted }
}

/** Creates an administrator-authored word. Source columns stay null. */
export async function insertManualVocabulary(
  db: VocabularyDatabase,
  input: ManualVocabularyInput
): Promise<VocabularyRecord> {
  const now = new Date()
  const [record] = await db
    .insert(vocabulary)
    .values({
      id: randomUUID(),
      externalId: null,
      hanzi: input.hanzi,
      pinyin: input.pinyin,
      pinyinSortKey: normalizePinyin(input.pinyin),
      translationId: input.translationId,
      translationEn: input.translationEn,
      kind: "manual",
      sourceName: null,
      sourceUrl: null,
      sourceVersion: null,
      verifiedAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  return record
}

/**
 * Every word, sorted the way the list renders it: by tone-free pinyin, with
 * Hanzi as a stable tie-breaker so two readings of one spelling keep a fixed
 * order. Selects only the client-safe columns.
 */
export function selectVocabulary(
  db: VocabularyDatabase
): Promise<Array<VocabularyItem>> {
  return db
    .select({
      id: vocabulary.id,
      hanzi: vocabulary.hanzi,
      pinyin: vocabulary.pinyin,
      pinyinSortKey: vocabulary.pinyinSortKey,
      translationId: vocabulary.translationId,
      translationEn: vocabulary.translationEn,
      kind: vocabulary.kind,
    })
    .from(vocabulary)
    .orderBy(asc(vocabulary.pinyinSortKey), asc(vocabulary.hanzi))
}

/** The handler behind `getVocabularyFn`; resolves the database itself. */
export function getVocabulary(): Promise<Array<VocabularyItem>> {
  return selectVocabulary(getDatabase())
}

export async function countVocabulary(db: VocabularyDatabase): Promise<number> {
  const [row] = await db.select({ value: count() }).from(vocabulary)
  return row?.value ?? 0
}

export async function getVocabularyByHanzi(
  db: VocabularyDatabase,
  hanzi: string
): Promise<VocabularyRecord | undefined> {
  const [record] = await db
    .select()
    .from(vocabulary)
    .where(eq(vocabulary.hanzi, hanzi))
    .limit(1)
  return record
}
