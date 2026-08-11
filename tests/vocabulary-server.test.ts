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
  deleteManualVocabulary,
  getVocabularyByHanzi,
  insertManualVocabulary,
  listManualVocabulary,
  seedOfficialVocabulary,
  selectVocabulary,
  updateManualVocabulary,
} from "../src/features/vocabulary/vocabulary.server"
import {
  isAdminPassword,
  isValidAdminToken,
  issueAdminToken,
} from "../src/features/admin/auth.server"
import { manualVocabularySchema } from "../src/features/admin/vocabulary.schemas"
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

  it("accepts the syllabus' two 批 rows, which share a word and pronunciation", async () => {
    await seedOfficialVocabulary(db, [
      { ...officialRow, external_id: "hsk3-4-0555", hanzi: "批", pinyin: "pī" },
      { ...officialRow, external_id: "hsk3-4-0556", hanzi: "批", pinyin: "pī" },
    ])

    expect(await countVocabulary(db)).toBe(2)
  })
})

describe("selectVocabulary", () => {
  it("sorts by tone-free pinyin, then Hanzi, and hides server-only columns", async () => {
    await seedOfficialVocabulary(db, [
      { ...officialRow, external_id: "x-3", hanzi: "会议", pinyin: "huìyì" },
      { ...officialRow, external_id: "x-1", hanzi: "安排", pinyin: "ānpái" },
      { ...officialRow, external_id: "x-2", hanzi: "俺", pinyin: "ǎn" },
    ])

    const items = await selectVocabulary(db)

    expect(items.map((entry) => entry.hanzi)).toEqual(["俺", "安排", "会议"])
    expect(Object.keys(items[0]).sort()).toEqual([
      "hanzi",
      "id",
      "kind",
      "pinyin",
      "pinyinSortKey",
      "translationEn",
      "translationId",
    ])
  })
})

describe("admin session tokens", () => {
  const secret = "a-secret-that-is-at-least-32-bytes-long"

  it("accepts a token it just issued", async () => {
    const token = await issueAdminToken(secret)
    expect(await isValidAdminToken(token, secret)).toBe(true)
  })

  it("rejects a token signed with a different secret", async () => {
    const token = await issueAdminToken(secret)
    expect(await isValidAdminToken(token, `${secret}-other`)).toBe(false)
  })

  it("rejects an expired token", async () => {
    const token = await issueAdminToken(secret, -60)
    expect(await isValidAdminToken(token, secret)).toBe(false)
  })

  it("rejects a tampered or missing token", async () => {
    const token = await issueAdminToken(secret)
    expect(await isValidAdminToken(`${token}x`, secret)).toBe(false)
    expect(await isValidAdminToken(undefined, secret)).toBe(false)
    expect(await isValidAdminToken("", secret)).toBe(false)
  })
})

describe("admin password check", () => {
  it("accepts only the configured password", () => {
    expect(isAdminPassword("correct horse", "correct horse")).toBe(true)
    // Same length, so the comparison cannot short-circuit on length alone.
    expect(isAdminPassword("correct horsf", "correct horse")).toBe(false)
    expect(isAdminPassword("short", "correct horse")).toBe(false)
  })

  it("refuses to authenticate when no password is configured", () => {
    expect(isAdminPassword("anything", undefined)).toBe(false)
    expect(isAdminPassword("", "")).toBe(false)
  })
})

describe("manual vocabulary validation", () => {
  it("requires every field and trims what it accepts", () => {
    const result = manualVocabularySchema.safeParse({
      hanzi: "  例词  ",
      pinyin: "lìcí",
      translationId: "contoh kata",
      translationEn: "example word",
    })
    expect(result.success).toBe(true)
    expect(result.data?.hanzi).toBe("例词")

    const missing = manualVocabularySchema.safeParse({
      hanzi: "   ",
      pinyin: "",
      translationId: "",
      translationEn: "",
    })
    expect(missing.success).toBe(false)
  })
})

describe("manual vocabulary mutations", () => {
  it("updates and deletes a manual row", async () => {
    const created = await insertManualVocabulary(db, manualRow)

    const updated = await updateManualVocabulary(db, created.id, {
      ...manualRow,
      translationId: "kata contoh",
    })
    expect(updated?.translationId).toBe("kata contoh")

    expect(await deleteManualVocabulary(db, created.id)).toBe(true)
    expect(await countVocabulary(db)).toBe(0)
  })

  it("refuses to change or remove an official row", async () => {
    await seedOfficialVocabulary(db, [officialRow])
    const id = `official:${officialRow.external_id}`

    expect(
      await updateManualVocabulary(db, id, { ...manualRow, hanzi: "篡改" })
    ).toBeUndefined()
    expect(await deleteManualVocabulary(db, id)).toBe(false)

    expect(await getVocabularyByHanzi(db, officialRow.hanzi)).toMatchObject({
      kind: "official",
      translationId: officialRow.translation_id,
    })
  })

  it("recomputes the sort key when the pronunciation changes", async () => {
    const created = await insertManualVocabulary(db, manualRow)

    const updated = await updateManualVocabulary(db, created.id, {
      ...manualRow,
      pinyin: "ǍN PÁI",
    })
    expect(updated?.pinyinSortKey).toBe("anpai")
  })

  it("lists only manual rows", async () => {
    await seedOfficialVocabulary(db, [officialRow])
    await insertManualVocabulary(db, manualRow)

    const listed = await listManualVocabulary(db)
    expect(listed.map((entry) => entry.hanzi)).toEqual([manualRow.hanzi])
  })
})
