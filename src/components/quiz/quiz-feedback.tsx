import { useEffect } from "react"
import { Button } from "@/components/ui/button"

/** How long a correct answer is celebrated before the next question. */
export const CORRECT_ADVANCE_MS = 750

/**
 * The bar under every question once it has been answered.
 *
 * Correct answers advance themselves — nothing to read, so stopping to ask for
 * a click is friction. Wrong answers wait: the correct answer is right there,
 * and taking it away before the learner has read it wastes the most useful
 * moment in the whole exercise.
 *
 * `autoAdvance` is the exception to that first half. Handwriting reveals the
 * character *after* the answer, and a correct answer that scrolls past in three
 * quarters of a second would take the only thing worth looking at with it.
 *
 * `role="status"` rather than `alert`: a wrong answer in a quiz is expected,
 * and alert would interrupt a screen reader mid-sentence every time.
 */
export function QuizFeedback({
  correct,
  answer,
  autoAdvance = true,
  onNext,
}: {
  correct: boolean
  /** Shown only when wrong: what the answer should have been. */
  answer?: React.ReactNode
  /** When false, even a correct answer waits for the learner to press Lanjut. */
  autoAdvance?: boolean
  onNext: () => void
}) {
  useEffect(() => {
    if (!correct || !autoAdvance) return
    const timer = setTimeout(onNext, CORRECT_ADVANCE_MS)
    return () => clearTimeout(timer)
  }, [correct, autoAdvance, onNext])

  return (
    <div
      role="status"
      data-testid="quiz-feedback"
      data-correct={correct}
      className={`mt-4 flex flex-wrap items-center justify-between gap-3 border-l-2 py-3 pl-4 ${
        correct ? "border-correct" : "border-destructive"
      }`}
    >
      <div className="min-w-0">
        <p
          className={`eyebrow ${correct ? "text-correct" : "text-destructive"}`}
        >
          {correct ? "Benar" : "Belum tepat"}
        </p>
        {!correct && answer ? <p className="mt-1 text-sm">{answer}</p> : null}
      </div>

      {correct && autoAdvance ? null : (
        <Button size="sm" onClick={onNext} autoFocus>
          Lanjut
        </Button>
      )}
    </div>
  )
}
