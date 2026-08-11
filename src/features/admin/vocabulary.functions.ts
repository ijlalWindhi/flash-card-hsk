import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { getDatabase } from "@/db/client.server"
import type { VocabularyItem } from "@/features/vocabulary/types"
import {
  deleteManualVocabulary,
  insertManualVocabulary,
  listManualVocabulary,
  updateManualVocabulary,
} from "@/features/vocabulary/vocabulary.server"
import { requireAdmin } from "./auth.server"
import type { FieldError, MutationResult } from "./vocabulary.schemas"
import { manualVocabularySchema } from "./vocabulary.schemas"

const DUPLICATE: FieldError = {
  field: "hanzi",
  message: "Kata dengan hanzi dan pinyin ini sudah ada.",
}

/** SQLite reports the partial unique index as a constraint violation. */
function isDuplicateError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /UNIQUE constraint failed|SQLITE_CONSTRAINT/i.test(message)
}

function failure(errors: Array<FieldError>): MutationResult<never> {
  return { ok: false, errors }
}

export const listManualVocabularyFn = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAdmin()
    return listManualVocabulary(getDatabase())
  },
)

export const createManualVocabularyFn = createServerFn({ method: "POST" })
  .validator(manualVocabularySchema)
  .handler(async ({ data }): Promise<MutationResult<VocabularyItem>> => {
    await requireAdmin()

    try {
      const record = await insertManualVocabulary(getDatabase(), data)
      return { ok: true, data: toItem(record) }
    } catch (error) {
      if (isDuplicateError(error)) return failure([DUPLICATE])
      throw error
    }
  })

export const updateManualVocabularyFn = createServerFn({ method: "POST" })
  .validator(manualVocabularySchema.extend({ id: z.string().min(1) }))
  .handler(async ({ data }): Promise<MutationResult<VocabularyItem>> => {
    await requireAdmin()

    try {
      const record = await updateManualVocabulary(getDatabase(), data.id, data)
      if (!record) {
        return failure([
          { field: "form", message: "Kata ini bukan entri manual dan tidak bisa diubah." },
        ])
      }
      return { ok: true, data: toItem(record) }
    } catch (error) {
      if (isDuplicateError(error)) return failure([DUPLICATE])
      throw error
    }
  })

export const deleteManualVocabularyFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }): Promise<MutationResult<{ id: string }>> => {
    await requireAdmin()

    const removed = await deleteManualVocabulary(getDatabase(), data.id)
    if (!removed) {
      return failure([
        { field: "form", message: "Kata ini bukan entri manual dan tidak bisa dihapus." },
      ])
    }
    return { ok: true, data: { id: data.id } }
  })

function toItem(record: {
  id: string
  hanzi: string
  pinyin: string
  pinyinSortKey: string
  translationId: string
  translationEn: string
  kind: "official" | "manual"
}): VocabularyItem {
  return {
    id: record.id,
    hanzi: record.hanzi,
    pinyin: record.pinyin,
    pinyinSortKey: record.pinyinSortKey,
    translationId: record.translationId,
    translationEn: record.translationEn,
    kind: record.kind,
  }
}
