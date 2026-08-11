// @vitest-environment node
import { createClient } from "@libsql/client"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/libsql"
import { migrate } from "drizzle-orm/libsql/migrator"
import { beforeEach, describe, expect, it } from "vitest"
import { vocabulary as vocabularyTable } from "../src/db/schema"
import type { VocabularyDatabase } from "../src/db/client.server"
import {
  countVocabulary,
  getVocabularyByHanzi,
  insertManualVocabulary,
  seedOfficialVocabulary,
} from "../src/features/vocabulary/vocabulary.server"
import type { VocabularyCsvRow } from "../scripts/validate-hsk4-dataset"

const officialRow: VocabularyCsvRow = {
  external_id: "hsk3-4-0006",
  hanzi: "安排",
  pinyin: "ānpái",
  translation_id: "mengatur;merencanakan",
  translation_en: "to arrange;to plan",
  source_name: "CLEC 新版HSK考试大纲",
  source_url: "https://example.invalid/syllabus.pdf",
  source_version: "2025-11",
  verified_at: "2026-08-11",
}

const manualRow = {
  hanzi: "例词",
  pinyin: "lìcí",
  translationId: "contoh kata",
  translationEn: "example word",
}

let db: VocabularyDatabase

beforeEach(async () => {
  db = drizzle(createClient({ url: ":memory:" }))
  await migrate(db, { migrationsFolder: "./drizzle" })
})

describe("vocabulary persistence", () => {
  it("inserts official rows once and preserves manually added words", async () => {
    await seedOfficialVocabulary(db, [officialRow])
    await insertManualVocabulary(db, manualRow)
    await seedOfficialVocabulary(db, [officialRow])

    expect(await countVocabulary(db)).toBe(2)
    expect(await getVocabularyByHanzi(db, manualRow.hanzi)).toMatchObject(
      manualRow
    )
  })

  it("reports what it inserted and what it skipped", async () => {
    expect(await seedOfficialVocabulary(db, [officialRow])).toEqual({
      inserted: 1,
      skipped: 0,
    })
    expect(await seedOfficialVocabulary(db, [officialRow])).toEqual({
      inserted: 0,
      skipped: 1,
    })
  })

  it("keeps an administrator's edit to an official row across a reseed", async () => {
    await seedOfficialVocabulary(db, [officialRow])
    await db
      .update(vocabularyTable)
      .set({ translationId: "menyusun jadwal" })
      .where(eq(vocabularyTable.externalId, officialRow.external_id))

    await seedOfficialVocabulary(db, [officialRow])

    expect(await getVocabularyByHanzi(db, officialRow.hanzi)).toMatchObject({
      translationId: "menyusun jadwal",
    })
  })

  it("stores official rows with their provenance and a sortable pinyin key", async () => {
    await seedOfficialVocabulary(db, [officialRow])

    expect(await getVocabularyByHanzi(db, officialRow.hanzi)).toMatchObject({
      kind: "official",
      sourceName: officialRow.source_name,
      sourceUrl: officialRow.source_url,
      sourceVersion: officialRow.source_version,
      verifiedAt: officialRow.verified_at,
      pinyinSortKey: "anpai",
    })
  })

  it("stores manual rows without borrowed provenance", async () => {
    await insertManualVocabulary(db, manualRow)

    expect(await getVocabularyByHanzi(db, manualRow.hanzi)).toMatchObject({
      kind: "manual",
      externalId: null,
      sourceName: null,
      sourceUrl: null,
    })
  })

  it("rejects a second manual entry with the same word and pronunciation", async () => {
    await insertManualVocabulary(db, manualRow)

    await expect(insertManualVocabulary(db, manualRow)).rejects.toThrow()
  })
})
