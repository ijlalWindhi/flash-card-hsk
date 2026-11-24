import { Button } from "@/components/ui/button"

/**
 * The bar under every question once it has been answered.
 *
 * Every answer — right or wrong — waits for Lanjut and shows the word in full.
 * A right answer can be a lucky guess, so it gets the same look at the Hanzi,
 * pinyin and meaning that a wrong one does.
 *
 * `role="status"` rather than `alert`: a wrong answer in a quiz is expected,
 * and alert would interrupt a screen reader mid-sentence every time.
 */
export function QuizFeedback({
  correct,
  answer,
  onNext,
}: {
  correct: boolean
  /** The word in full: what the answer is (or should have been). */
  answer?: React.ReactNode
  onNext: () => void
}) {
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
        {answer ? <p className="mt-1 text-sm">{answer}</p> : null}
      </div>

      <Button size="sm" onClick={onNext} autoFocus>
        Lanjut
      </Button>
    </div>
  )
}
