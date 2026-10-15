import { z } from "zod"

/**
 * What the browser reports when a quiz ends.
 *
 * Grading happens client-side, so this payload is asserted rather than proven.
 * It is still validated: the numbers have to be internally consistent before
 * they are allowed to touch anyone's statistics, which stops a malformed or
 * truncated request from writing nonsense that later reads as a record.
 */
/**
 * A sanity bound, not a product limit. A learner can quiz a whole list in one
 * session, so it must stay above the longest deck plus the administrator's own
 * words — HSK 2.0 Level 5 alone is 1,300 — or that session's result is refused
 * after it has been played. 5,000 is the whole HSK 2.0 syllabus.
 */
const MAX_SESSION_WORDS = 5000

export const quizResultSchema = z
  .object({
    mode: z.enum(["choice", "match", "typing", "truefalse", "draw"]),
    source: z.enum(["flashcard", "random", "selected", "review"]),
    bestStreak: z.number().int().min(0).max(MAX_SESSION_WORDS),
    dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid."),
    words: z
      .array(
        z.object({
          wordId: z.string().min(1).max(120),
          hanzi: z.string().min(1).max(40),
          correct: z.boolean(),
        })
      )
      .min(1, "Sesi kosong tidak bisa dicatat.")
      .max(MAX_SESSION_WORDS, "Sesi terlalu panjang."),
  })
  .refine((value) => value.bestStreak <= value.words.length, {
    message: "Beruntun tidak mungkin melebihi jumlah jawaban.",
    path: ["bestStreak"],
  })

export type QuizResultInput = z.infer<typeof quizResultSchema>
