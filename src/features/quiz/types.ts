import type { VocabularyItem } from "@/features/vocabulary/types"

export type QuizMode = "choice" | "match" | "typing" | "truefalse" | "draw"

/** Where the deck came from. Recorded with the result, never used to grade. */
export type QuizSource = "flashcard" | "random" | "selected" | "review"

/** What a multiple-choice question asks for, which varies question to question. */
export type ChoiceAsk = "meaning" | "hanzi" | "pinyin"

type QuestionBase = {
  /** Stable within one built quiz; used as a React key and for feedback state. */
  id: string
  /** Every word this question exercises, for per-word statistics. */
  wordIds: Array<string>
}

export type ChoiceQuestion = QuestionBase & {
  kind: "choice"
  word: VocabularyItem
  ask: ChoiceAsk
  /** The text shown above the options: a Hanzi, or a meaning. */
  prompt: string
  promptIsHanzi: boolean
  options: Array<string>
  answerIndex: number
}

export type MatchPair = { word: VocabularyItem; meaning: string }

export type MatchQuestion = QuestionBase & {
  kind: "match"
  /** Left column, in display order. */
  pairs: Array<MatchPair>
  /** Right column: indices into `pairs`, shuffled. */
  meaningOrder: Array<number>
}

export type TypingQuestion = QuestionBase & {
  kind: "typing"
  word: VocabularyItem
}

export type TrueFalseQuestion = QuestionBase & {
  kind: "truefalse"
  word: VocabularyItem
  /** Sometimes this word's meaning, sometimes another word's. */
  shownMeaning: string
  isMatch: boolean
}

/**
 * Pinyin in; the meaning is typed and the character is drawn by hand.
 *
 * Carries nothing beyond the word itself, because the drawing is never graded —
 * comparing a learner's handwriting to a printed glyph is not something this app
 * can do fairly, so the character is revealed for the learner to judge instead.
 */
export type DrawQuestion = QuestionBase & {
  kind: "draw"
  word: VocabularyItem
}

export type QuizQuestion =
  | ChoiceQuestion
  | MatchQuestion
  | TypingQuestion
  | TrueFalseQuestion
  | DrawQuestion

/** One word's outcome, accumulated as the learner plays. */
export type WordOutcome = {
  wordId: string
  hanzi: string
  correct: boolean
}

export type QuizOutcome = {
  mode: QuizMode
  source: QuizSource
  total: number
  correct: number
  bestStreak: number
  /** Every word answered wrongly at least once, in the order they appeared. */
  wrongWords: Array<VocabularyItem>
  words: Array<WordOutcome>
}

/**
 * Questions a day that counts as "done".
 *
 * Deliberately small. A target that takes twenty minutes gets skipped on a busy
 * day and takes the streak with it; one that takes two minutes survives the
 * busy day, which is the only thing a streak is for.
 */
export const DAILY_TARGET = 20

export const MODE_LABELS: Record<QuizMode, string> = {
  choice: "Pilihan ganda",
  match: "Mencocokkan",
  typing: "Ketik jawaban",
  truefalse: "Benar atau salah",
  draw: "Tulis hanzi",
}

export const MODE_DESCRIPTIONS: Record<QuizMode, string> = {
  choice: "Satu hanzi, beberapa pilihan jawaban.",
  match: "Jodohkan hanzi dengan artinya.",
  typing: "Ketik pinyin dari hanzi yang muncul.",
  truefalse: "Tebak apakah pasangan hanzi dan arti itu cocok.",
  draw: "Dari pinyin: tulis hanzinya dan ketik artinya.",
}

export const SOURCE_LABELS: Record<QuizSource, string> = {
  flashcard: "Lanjutan sesi belajar",
  random: "Kata acak",
  selected: "Pilihanmu",
  review: "Kata yang sering salah",
}
