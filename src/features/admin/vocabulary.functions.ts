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

const UNAVAILABLE: FieldError = {
  field: "form",
  message: "Perubahan gagal disimpan. Basis data tidak merespons — coba lagi.",
}

/**
 * SQLite reports the partial unique index as a constraint violation.
 *
 * Drizzle wraps the driver error, so the reason lives on `cause`, not on the
 * message it prints. Walking the chain is what makes a duplicate word show up
 * beside the Hanzi field instead of as a generic database failure.
 */
function isDuplicateError(error: unknown): boolean {
  for (
    let current: unknown = error, depth = 0;
    current && depth < 5;
    depth += 1
  ) {
    const { message, code } = current as { message?: string; code?: string }
    if (
      /UNIQUE constraint failed|SQLITE_CONSTRAINT/i.test(
        `${message ?? ""} ${code ?? ""}`
      )
    ) {
      return true
    }
    current = (current as { cause?: unknown }).cause
  }
  return false
}

/**
 * Turns any mutation failure into something the form can render.
 *
 * Nothing is rethrown: an unhandled server-function rejection would replace the
 * page with an error boundary and throw away everything the editor had typed.
 */
function toFailure(error: unknown): MutationResult<never> {
  if (isDuplicateError(error)) return failure([DUPLICATE])
  console.error("vocabulary mutation failed", error)
  return failure([UNAVAILABLE])
}

function failure(errors: Array<FieldError>): MutationResult<never> {
  return { ok: false, errors }
}

export const listManualVocabularyFn = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAdmin()
    return listManualVocabulary(getDatabase())
  }
)

export const createManualVocabularyFn = createServerFn({ method: "POST" })
  .validator(manualVocabularySchema)
  .handler(async ({ data }): Promise<MutationResult<VocabularyItem>> => {
    await requireAdmin()

    try {
      const record = await insertManualVocabulary(getDatabase(), data)
      return { ok: true, data: toItem(record) }
    } catch (error) {
      return toFailure(error)
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
          {
            field: "form",
            message: "Kata ini bukan entri manual dan tidak bisa diubah.",
          },
        ])
      }
      return { ok: true, data: toItem(record) }
    } catch (error) {
      return toFailure(error)
    }
  })

export const deleteManualVocabularyFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }): Promise<MutationResult<{ id: string }>> => {
    await requireAdmin()

    try {
      const removed = await deleteManualVocabulary(getDatabase(), data.id)
      if (!removed) {
        return failure([
          {
            field: "form",
            message: "Kata ini bukan entri manual dan tidak bisa dihapus.",
          },
        ])
      }
      return { ok: true, data: { id: data.id } }
    } catch (error) {
      return toFailure(error)
    }
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
