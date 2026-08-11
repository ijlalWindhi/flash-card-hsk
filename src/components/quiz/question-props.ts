import type { WordOutcome } from "@/features/quiz/types"

/**
 * What every question component reports back.
 *
 * Two callbacks rather than one because the two moments are different:
 * `onResolve` fires the instant an answer is given, so the streak counter reacts
 * immediately, while `onNext` fires when the learner is done reading the
 * feedback. Collapsing them would make the score lag a question behind.
 */
export type QuestionHandlers = {
  onResolve: (outcomes: Array<WordOutcome>) => void
  onNext: () => void
}
