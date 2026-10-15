import { describe, expect, it } from "vitest"
import { quizResultSchema } from "./quiz.schemas"

describe("quizResultSchema", () => {
  it("accepts a session covering the whole HSK 2.0 Level 5 list", () => {
    // The quiz dialog offers every word in a list; refusing the result of the
    // longest one would throw away a session the learner already played.
    const words = Array.from({ length: 1300 }, (_, i) => ({
      wordId: `official:hsk2-5-${String(i + 1).padStart(4, "0")}`,
      hanzi: "哎",
      correct: true,
    }))
    const result = quizResultSchema.safeParse({
      mode: "choice",
      source: "random",
      bestStreak: 1300,
      dayKey: "2026-10-15",
      words,
    })
    expect(result.success).toBe(true)
  })
})
