import { formatSenses } from "@/features/vocabulary/format"
import type { VocabularyItem } from "@/features/vocabulary/types"
import type { ChoiceAsk, MatchPair, QuizMode, QuizQuestion } from "./types"

/** Pairs per matching board. Five fits a phone screen without scrolling. */
export const MATCH_BOARD_SIZE = 5

/** The ceiling, not a promise: a small deck yields fewer, never padded ones. */
export const MAX_CHOICE_OPTIONS = 4

const CHOICE_ASKS: Array<ChoiceAsk> = ["meaning", "hanzi", "pinyin"]

/**
 * The smallest deck each mode can make a real question from.
 *
 * Multiple choice needs a second word to have something wrong to offer, and
 * true/false needs one to build a mismatched pair. Matching needs enough tiles
 * that pairing them is not automatic. Typing compares against the word itself,
 * so a single word is enough.
 */
export function minimumWordsFor(mode: QuizMode): number {
  switch (mode) {
    case "choice":
      return 2
    case "truefalse":
      return 2
    case "match":
      return 4
    case "typing":
      return 1
  }
}

export function shuffle<T>(items: Array<T>, random: () => number): Array<T> {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/** The text a given question direction shows for a word. */
export function displayFor(word: VocabularyItem, ask: ChoiceAsk): string {
  switch (ask) {
    case "meaning":
      return formatSenses(word.translationId)
    case "hanzi":
      return word.hanzi
    case "pinyin":
      return word.pinyin
  }
}

/**
 * Splits words into boards, never leaving a final board of one.
 *
 * A board with a single pair answers itself. When the remainder would be one,
 * the last two boards are rebalanced — six words become 3 + 3 rather than
 * 5 + 1.
 */
export function boardsFrom<T>(words: Array<T>, size: number): Array<Array<T>> {
  if (words.length <= size) return [words]

  const boards: Array<Array<T>> = []
  for (let i = 0; i < words.length; i += size) {
    boards.push(words.slice(i, i + size))
  }

  const last = boards[boards.length - 1]
  if (last.length < 2 && boards.length > 1) {
    const previous = boards[boards.length - 2]
    const merged = [...previous, ...last]
    const half = Math.ceil(merged.length / 2)
    boards.splice(
      boards.length - 2,
      2,
      merged.slice(0, half),
      merged.slice(half)
    )
  }

  return boards
}

/**
 * Collects wrong answers whose displayed text differs from the right one.
 *
 * Words are drawn from the deck first so the alternatives feel like near
 * misses, then from the wider pool. Comparison is on the rendered string: two
 * different words that both mean "sudah" would be an unfair option pair.
 */
function distractors(
  answer: string,
  ask: ChoiceAsk,
  wordId: string,
  deck: Array<VocabularyItem>,
  pool: Array<VocabularyItem>,
  wanted: number,
  random: () => number
): Array<string> {
  const seen = new Set([answer])
  const found: Array<string> = []

  for (const candidate of [
    ...shuffle(deck, random),
    ...shuffle(pool, random),
  ]) {
    if (found.length >= wanted) break
    if (candidate.id === wordId) continue

    const text = displayFor(candidate, ask)
    if (seen.has(text)) continue

    seen.add(text)
    found.push(text)
  }

  return found
}

function buildChoice(
  words: Array<VocabularyItem>,
  pool: Array<VocabularyItem>,
  random: () => number
): Array<QuizQuestion> {
  return words.map((word, index) => {
    const ask = CHOICE_ASKS[Math.floor(random() * CHOICE_ASKS.length)]
    const answer = displayFor(word, ask)
    const wrong = distractors(
      answer,
      ask,
      word.id,
      words,
      pool,
      MAX_CHOICE_OPTIONS - 1,
      random
    )
    const options = shuffle([answer, ...wrong], random)

    return {
      kind: "choice",
      id: `choice-${index}-${word.id}`,
      wordIds: [word.id],
      word,
      ask,
      // Asking for the Hanzi means the prompt is the meaning, and vice versa.
      prompt: ask === "hanzi" ? formatSenses(word.translationId) : word.hanzi,
      promptIsHanzi: ask !== "hanzi",
      options,
      answerIndex: options.indexOf(answer),
    }
  })
}

function buildMatch(
  words: Array<VocabularyItem>,
  random: () => number
): Array<QuizQuestion> {
  return boardsFrom(words, MATCH_BOARD_SIZE).map((board, index) => {
    const pairs: Array<MatchPair> = board.map((word) => ({
      word,
      meaning: formatSenses(word.translationId),
    }))
    const order = shuffle(
      pairs.map((_, position) => position),
      random
    )

    return {
      kind: "match",
      id: `match-${index}`,
      wordIds: board.map((word) => word.id),
      pairs,
      // A board where every tile already sits beside its pair is no test.
      meaningOrder:
        pairs.length > 1 && order.every((value, position) => value === position)
          ? [...order.slice(1), order[0]]
          : order,
    }
  })
}

function buildTyping(words: Array<VocabularyItem>): Array<QuizQuestion> {
  return words.map((word, index) => ({
    kind: "typing",
    id: `typing-${index}-${word.id}`,
    wordIds: [word.id],
    word,
  }))
}

/**
 * Half true pairs, half false, then shuffled.
 *
 * Balancing beats an independent coin flip per question: over ten questions a
 * fair coin quite often lands eight to two, and a learner who notices the
 * imbalance can score well by guessing the majority.
 */
function buildTrueFalse(
  words: Array<VocabularyItem>,
  pool: Array<VocabularyItem>,
  random: () => number
): Array<QuizQuestion> {
  const truthful = new Set(
    shuffle(words, random)
      .slice(0, Math.round(words.length / 2))
      .map((word) => word.id)
  )

  return words.map((word, index) => {
    const own = formatSenses(word.translationId)
    const shouldMatch = truthful.has(word.id)
    const alternatives = shouldMatch
      ? []
      : distractors(own, "meaning", word.id, words, pool, 1, random)

    // With no distinct meaning to borrow — a two-word deck whose meanings read
    // the same — the honest question is the true one.
    const borrowed: string | undefined =
      alternatives.length > 0 ? alternatives[0] : undefined

    return {
      kind: "truefalse",
      id: `truefalse-${index}-${word.id}`,
      wordIds: [word.id],
      word,
      shownMeaning: borrowed ?? own,
      isMatch: shouldMatch || borrowed === undefined,
    }
  })
}

/**
 * Builds every question for one quiz run.
 *
 * `deck` is what the learner chose to be tested on. `pool` is an optional wider
 * vocabulary for wrong answers; the quiz page passes nothing, because a deck of
 * two words should offer two options rather than pad the list with words the
 * learner never asked about — and because an empty pool keeps the whole session
 * self-contained in session storage. `random` is a parameter so generation is
 * testable; callers pass `Math.random`.
 *
 * @throws RangeError when the deck is too small for the mode.
 */
export function buildQuiz(
  deck: Array<VocabularyItem>,
  mode: QuizMode,
  count: number,
  random: () => number,
  pool: Array<VocabularyItem> = []
): Array<QuizQuestion> {
  const minimum = minimumWordsFor(mode)
  if (deck.length < minimum) {
    throw new RangeError(
      `Mode ini butuh minimal ${minimum} kata, sedangkan hanya ada ${deck.length}.`
    )
  }

  const limit = Math.max(minimum, Math.min(count, deck.length))
  const words = shuffle(deck, random).slice(0, limit)

  switch (mode) {
    case "choice":
      return buildChoice(words, pool, random)
    case "match":
      return buildMatch(words, random)
    case "typing":
      return buildTyping(words)
    case "truefalse":
      return buildTrueFalse(words, pool, random)
  }
}
