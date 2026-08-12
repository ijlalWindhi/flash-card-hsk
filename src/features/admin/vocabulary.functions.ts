import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { getDatabase } from "@/db/client.server"
import type { VocabularyItem } from "@/features/vocabulary/types"
import {
  deleteManualVocabulary,
  findVocabularyByHanzi,
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
 * Refuses a Hanzi the collection already holds, whichever list it came from.
 *
 * The unique index only stops one manual row duplicating another, and only when
 * the pinyin matches too — so 好 from the syllabus could quietly be added a
 * second time. Checking here means the editor is told which list already has
 * it, rather than discovering the twin later in the word list.
 *
 * `exceptId` is the row being edited: leaving its own Hanzi untouched is not a
 * duplicate.
 */
async function takenBy(
  hanzi: string,
  exceptId?: string
): Promise<"official" | "manual" | null> {
  const rows = await findVocabularyByHanzi(getDatabase(), hanzi)
  return rows.find((row) => row.id !== exceptId)?.kind ?? null
}

function alreadyAdded(
  hanzi: string,
  kind: "official" | "manual"
): FieldError {
  return {
    field: "hanzi",
    message:
      kind === "official"
        ? `${hanzi} sudah ada di daftar resmi HSK, tidak perlu ditambahkan lagi.`
        : `${hanzi} sudah pernah ditambahkan.`,
  }
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

/**
 * Answers "is this Hanzi already taken?" while the editor is still typing.
 *
 * POST rather than GET so no cache can hand back a verdict about a word that
 * has since been added. A failed lookup reports "free": this is a courtesy
 * ahead of the real gate in `createManualVocabularyFn`, and a database hiccup
 * should not put a duplicate warning on a word that may well be fine.
 */
export const checkManualVocabularyHanziFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      hanzi: z.string().trim().min(1).max(40),
      excludeId: z.string().min(1).optional(),
    })
  )
  .handler(async ({ data }): Promise<{ message: string | null }> => {
    await requireAdmin()

    try {
      const taken = await takenBy(data.hanzi, data.excludeId)
      return { message: taken ? alreadyAdded(data.hanzi, taken).message : null }
    } catch (error) {
      console.error("hanzi availability check failed", error)
      return { message: null }
    }
  })

export const createManualVocabularyFn = createServerFn({ method: "POST" })
  .validator(manualVocabularySchema)
  .handler(async ({ data }): Promise<MutationResult<VocabularyItem>> => {
    await requireAdmin()

    try {
      const taken = await takenBy(data.hanzi)
      if (taken) return failure([alreadyAdded(data.hanzi, taken)])

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
      const taken = await takenBy(data.hanzi, data.id)
      if (taken) return failure([alreadyAdded(data.hanzi, taken)])

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
