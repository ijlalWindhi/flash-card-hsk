import { describe, expect, it } from "vitest"
import type { VocabularyItem } from "@/features/vocabulary/types"
import { boardsFrom, buildQuiz, minimumWordsFor } from "./build"
import type { ChoiceQuestion, MatchQuestion, TrueFalseQuestion } from "./types"

function word(id: string): VocabularyItem {
  return {
    id,
    hanzi: `汉${id}`,
    pinyin: `hàn${id}`,
    pinyinSortKey: `han${id}`,
    translationId: `arti ${id}`,
    translationEn: `meaning ${id}`,
    kind: "official",
  }
}

const deck = ["a", "b", "c", "d", "e", "f"].map(word)

/** Deterministic stand-in for Math.random. */
function sequence(values: Array<number>): () => number {
  let index = 0
  return () => values[index++ % values.length]
}

describe("minimumWordsFor", () => {
  it("demands a second word wherever a wrong answer is needed", () => {
    expect(minimumWordsFor("choice")).toBe(2)
    expect(minimumWordsFor("truefalse")).toBe(2)
    expect(minimumWordsFor("match")).toBe(4)
    expect(minimumWordsFor("typing")).toBe(1)
  })
})

describe("buildQuiz", () => {
  it("refuses a deck too small for the mode", () => {
    expect(() => buildQuiz([word("a")], "choice", 1, Math.random)).toThrow(
      RangeError
    )
    expect(() => buildQuiz(deck.slice(0, 3), "match", 3, Math.random)).toThrow(
      /minimal 4 kata/
    )
  })

  it("builds one question per word, capped at the requested count", () => {
    expect(buildQuiz(deck, "choice", 4, Math.random)).toHaveLength(4)
    expect(buildQuiz(deck, "typing", 99, Math.random)).toHaveLength(deck.length)
  })

  describe("multiple choice", () => {
    const questions = buildQuiz(
      deck,
      "choice",
      6,
      sequence([0.1, 0.6, 0.3, 0.9, 0.45])
    ) as Array<ChoiceQuestion>

    it("puts the right answer among the options exactly once", () => {
      for (const question of questions) {
        const answer = question.options[question.answerIndex]
        expect(answer).toBeDefined()
        expect(question.options.filter((o) => o === answer)).toHaveLength(1)
      }
    })

    it("never repeats an option within a question", () => {
      for (const question of questions) {
        expect(new Set(question.options).size).toBe(question.options.length)
      }
    })

    it("offers at most four options", () => {
      for (const question of questions) {
        expect(question.options.length).toBeLessThanOrEqual(4)
        expect(question.options.length).toBeGreaterThanOrEqual(2)
      }
    })

    /* The learner asked for exactly this: one Hanzi, two readings to choose
       between. A two-word deck cannot honestly offer more. */
    it("falls back to two options on a two-word deck", () => {
      const pair = buildQuiz(
        deck.slice(0, 2),
        "choice",
        2,
        () => 0.5
      ) as Array<ChoiceQuestion>

      for (const question of pair) {
        expect(question.options).toHaveLength(2)
      }
    })

    it("borrows wrong answers from the pool when the deck cannot supply them", () => {
      const [question] = buildQuiz(
        deck.slice(0, 2),
        "choice",
        2,
        () => 0.5,
        deck.slice(2)
      ) as Array<ChoiceQuestion>

      expect(question.options).toHaveLength(4)
    })

    it("shows the meaning as the prompt only when asking for the Hanzi", () => {
      for (const question of questions) {
        expect(question.promptIsHanzi).toBe(question.ask !== "hanzi")
      }
    })
  })

  describe("matching", () => {
    it("splits the deck into boards of at most five pairs", () => {
      const boards = buildQuiz(
        deck,
        "match",
        6,
        () => 0.5
      ) as Array<MatchQuestion>

      expect(boards.flatMap((board) => board.wordIds)).toHaveLength(6)
      for (const board of boards) {
        expect(board.pairs.length).toBeLessThanOrEqual(5)
        expect(board.pairs.length).toBeGreaterThanOrEqual(2)
      }
    })

    it("shuffles the meanings so no board is already solved", () => {
      const boards = buildQuiz(
        deck,
        "match",
        5,
        () => 0
      ) as Array<MatchQuestion>

      for (const board of boards) {
        expect(
          board.meaningOrder.every((value, position) => value === position)
        ).toBe(false)
      }
    })

    it("lists every pair exactly once on the right-hand column", () => {
      const boards = buildQuiz(
        deck,
        "match",
        6,
        () => 0.5
      ) as Array<MatchQuestion>

      for (const board of boards) {
        expect([...board.meaningOrder].sort()).toEqual(
          board.pairs.map((_, index) => index)
        )
      }
    })
  })

  describe("true or false", () => {
    const questions = buildQuiz(
      deck,
      "truefalse",
      6,
      sequence([0.2, 0.8, 0.5, 0.1])
    ) as Array<TrueFalseQuestion>

    it("balances true and false pairs rather than flipping a coin each time", () => {
      const matching = questions.filter((question) => question.isMatch).length
      expect(Math.abs(matching - questions.length / 2)).toBeLessThanOrEqual(1)
    })

    it("shows the word's own meaning exactly when the pair is true", () => {
      for (const question of questions) {
        const own = `arti ${question.word.id}`
        expect(question.shownMeaning === own).toBe(question.isMatch)
      }
    })
  })
})

describe("boardsFrom", () => {
  it("keeps a single board when everything fits", () => {
    expect(boardsFrom([1, 2, 3], 5)).toEqual([[1, 2, 3]])
  })

  it("splits evenly when the remainder is comfortable", () => {
    expect(boardsFrom([1, 2, 3, 4, 5, 6, 7], 5)).toEqual([
      [1, 2, 3, 4, 5],
      [6, 7],
    ])
  })

  /* A board holding one pair answers itself, so the last two are rebalanced. */
  it("never leaves a final board of one", () => {
    expect(boardsFrom([1, 2, 3, 4, 5, 6], 5)).toEqual([
      [1, 2, 3],
      [4, 5, 6],
    ])
  })
})
