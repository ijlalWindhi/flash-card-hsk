import type { SyllabusId } from "@/features/vocabulary/syllabus"
import type { VocabularyItem } from "@/features/vocabulary/types"
import type { QuizMode, QuizSource } from "./types"

export type QuizDeck = {
  words: Array<VocabularyItem>
  mode: QuizMode
  source: QuizSource
}

/**
 * Where a pending quiz lives between the start dialog and the quiz page.
 *
 * The same reasoning as the flashcard deck: per-tab, disposable, keyed per
 * syllabus, and far too many ids to put in a query string. Questions are *not*
 * stored — they are rebuilt from the words on arrival, so a refresh reshuffles
 * rather than replaying the identical quiz.
 */
export function quizSessionKey(syllabus: SyllabusId): string {
  return `hsk4-quiz-session:${syllabus}`
}

export function storeQuizDeck(syllabus: SyllabusId, deck: QuizDeck): void {
  sessionStorage.setItem(quizSessionKey(syllabus), JSON.stringify(deck))
}

/** Returns null for a missing, malformed or empty payload — never throws. */
export function readQuizDeck(syllabus: SyllabusId): QuizDeck | null {
  const raw = sessionStorage.getItem(quizSessionKey(syllabus))
  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    return isQuizDeck(parsed) ? parsed : null
  } catch {
    return null
  }
}

const MODES: Array<QuizMode> = [
  "choice",
  "match",
  "typing",
  "truefalse",
  "draw",
]
const SOURCES: Array<QuizSource> = ["flashcard", "random", "selected", "review"]

/**
 * The payload is whatever was in storage, so every field is checked as
 * `unknown`. Typing the candidate as a `Partial<QuizDeck>` would tell the
 * compiler the fields already have their proper types and quietly turn these
 * guards into dead code.
 */
function isQuizDeck(value: unknown): value is QuizDeck {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as {
    words?: unknown
    mode?: unknown
    source?: unknown
  }

  return (
    Array.isArray(candidate.words) &&
    candidate.words.length > 0 &&
    candidate.words.every(isWordLike) &&
    MODES.includes(candidate.mode as QuizMode) &&
    SOURCES.includes(candidate.source as QuizSource)
  )
}

function isWordLike(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false
  const word = value as { id?: unknown; hanzi?: unknown }
  return typeof word.id === "string" && typeof word.hanzi === "string"
}
