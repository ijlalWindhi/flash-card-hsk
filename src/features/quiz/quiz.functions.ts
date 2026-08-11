import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { isFirestoreConfigured } from "@/db/firestore.server"
import { currentUserId } from "@/features/accounts/auth.server"
import {
  getProgressSummary,
  getReviewWordIds,
  recordQuizResult,
} from "./progress.server"
import { quizResultSchema } from "./quiz.schemas"
import type { ProgressSummary, RecordedResult } from "./progress.types"

/**
 * The RPC surface for quiz progress.
 *
 * Every handler treats a guest as a normal, expected caller: the quiz is
 * playable signed out, so these return an empty answer instead of throwing.
 * Firestore being unconfigured is handled the same way, which keeps a
 * credential-free development environment usable.
 */
async function activeUserId(): Promise<string | null> {
  if (!isFirestoreConfigured()) return null
  try {
    return await currentUserId()
  } catch {
    return null
  }
}

export type RecordOutcome =
  | { saved: true; progress: RecordedResult }
  | { saved: false; reason: "guest" | "error" }

export const recordQuizResultFn = createServerFn({ method: "POST" })
  .validator(quizResultSchema)
  .handler(async ({ data }): Promise<RecordOutcome> => {
    const userId = await activeUserId()
    if (!userId) return { saved: false, reason: "guest" }

    try {
      return { saved: true, progress: await recordQuizResult(userId, data) }
    } catch {
      // The result screen is already rendered from local state; a failure here
      // costs the learner their history, not their session.
      return { saved: false, reason: "error" }
    }
  })

export const getProgressSummaryFn = createServerFn({ method: "GET" })
  .validator(z.object({ today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
  .handler(async ({ data }): Promise<ProgressSummary | null> => {
    const userId = await activeUserId()
    if (!userId) return null

    try {
      return await getProgressSummary(userId, data.today)
    } catch {
      return null
    }
  })

/**
 * The words this learner keeps missing, as ids.
 *
 * Ids rather than whole words because the caller — the vocabulary page — is
 * already holding all thousand entries from its own loader. Returning the full
 * records would mean joining Firestore statistics to Turso rows on the server
 * to send back data the browser already has.
 */
export const getReviewWordIdsFn = createServerFn({ method: "GET" })
  .validator(z.object({ limit: z.number().int().min(1).max(200) }))
  .handler(async ({ data }): Promise<Array<string>> => {
    const userId = await activeUserId()
    if (!userId) return []

    try {
      return await getReviewWordIds(userId, data.limit)
    } catch {
      return []
    }
  })
