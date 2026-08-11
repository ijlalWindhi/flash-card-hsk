import { normalizePinyin } from "@/features/vocabulary/normalize"
import type { VocabularyItem } from "@/features/vocabulary/types"
import type { QuizMode, QuizOutcome, QuizSource, WordOutcome } from "./types"

/**
 * Substitutions for tone-free keyboards.
 *
 * `ü` is on no layout a learner is likely to have, and both `v` and `u:` are
 * long-standing conventions for it in pinyin input. Applied before
 * `normalizePinyin`, which deliberately preserves the diaeresis because it
 * distinguishes `lü` from `lu`.
 */
function foldUmlaut(value: string): string {
  return value.replace(/u:/gi, "ü").replace(/v/gi, "ü")
}

/**
 * Compares typed pinyin against the expected reading.
 *
 * Tolerant of everything that is not the point of the exercise: tone marks,
 * capitalisation, spacing, and the missing `ü` key. Intolerant of a wrong
 * syllable, which is the only thing being tested.
 */
export function isTypedPinyinCorrect(
  typed: string,
  word: VocabularyItem
): boolean {
  const answer = normalizePinyin(foldUmlaut(typed))
  if (!answer) return false

  return (
    answer === word.pinyinSortKey || answer === normalizePinyin(word.pinyin)
  )
}

/** The longest run of consecutive correct answers, in the order they happened. */
export function longestStreak(outcomes: Array<WordOutcome>): number {
  let best = 0
  let run = 0

  for (const outcome of outcomes) {
    run = outcome.correct ? run + 1 : 0
    if (run > best) best = run
  }

  return best
}

/**
 * Turns the running record into the result screen's data.
 *
 * One entry per word *attempt*, so a matching board contributes five. A word
 * appears in `wrongWords` once however many times it was missed, in the order
 * it was first seen — the review list should read like the quiz, not like a
 * tally.
 */
export function summariseQuiz(
  mode: QuizMode,
  source: QuizSource,
  outcomes: Array<WordOutcome>,
  deck: Array<VocabularyItem>
): QuizOutcome {
  const byId = new Map(deck.map((word) => [word.id, word]))
  const wrongIds: Array<string> = []

  for (const outcome of outcomes) {
    if (!outcome.correct && !wrongIds.includes(outcome.wordId)) {
      wrongIds.push(outcome.wordId)
    }
  }

  return {
    mode,
    source,
    total: outcomes.length,
    correct: outcomes.filter((outcome) => outcome.correct).length,
    bestStreak: longestStreak(outcomes),
    wrongWords: wrongIds
      .map((id) => byId.get(id))
      .filter((word): word is VocabularyItem => word !== undefined),
    words: outcomes,
  }
}
