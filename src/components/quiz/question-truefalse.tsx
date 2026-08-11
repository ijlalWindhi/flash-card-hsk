import { useState } from "react"
import { QuizFeedback } from "@/components/quiz/quiz-feedback"
import { formatSenses } from "@/features/vocabulary/format"
import type { TrueFalseQuestion } from "@/features/quiz/types"
import type { QuestionHandlers } from "./question-props"

/**
 * The fastest mode: is this pairing right or not?
 *
 * Two large targets and no reading beyond the pair itself, which is what makes
 * it usable one-handed on a phone during the odd spare minute.
 */
export function QuestionTrueFalse({
  question,
  onResolve,
  onNext,
}: { question: TrueFalseQuestion } & QuestionHandlers) {
  const [answer, setAnswer] = useState<boolean | null>(null)
  const answered = answer !== null
  const correct = answer === question.isMatch

  function respond(said: boolean) {
    if (answered) return
    setAnswer(said)
    onResolve([
      {
        wordId: question.word.id,
        hanzi: question.word.hanzi,
        correct: said === question.isMatch,
      },
    ])
  }

  const buttonTone = (value: boolean) => {
    if (!answered) return "border-border bg-card hover:border-foreground"
    if (value === question.isMatch) return "border-correct bg-card text-correct"
    if (value === answer) return "border-destructive bg-card text-destructive"
    return "border-border bg-card text-muted-foreground opacity-60"
  }

  return (
    <div>
      <p className="eyebrow text-muted-foreground">
        Apakah pasangan ini cocok?
      </p>

      <div className="mt-4 grid min-h-[9rem] place-items-center gap-4 border-2 border-foreground bg-card px-6 py-8 text-center">
        <span className="hanzi text-6xl sm:text-7xl">
          {question.word.hanzi}
        </span>
        <span className="text-lg font-medium">{question.shownMeaning}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={answered}
          onClick={() => respond(true)}
          className={`min-h-14 border px-4 py-3 transition-colors disabled:cursor-default ${buttonTone(true)}`}
        >
          Cocok
        </button>
        <button
          type="button"
          disabled={answered}
          onClick={() => respond(false)}
          className={`min-h-14 border px-4 py-3 transition-colors disabled:cursor-default ${buttonTone(false)}`}
        >
          Tidak cocok
        </button>
      </div>

      {answered ? (
        <QuizFeedback
          correct={correct}
          answer={
            <>
              <span className="hanzi text-lg">{question.word.hanzi}</span>{" "}
              <span className="text-muted-foreground">
                {question.word.pinyin}
              </span>{" "}
              — {formatSenses(question.word.translationId)}
            </>
          }
          onNext={onNext}
        />
      ) : null}
    </div>
  )
}
