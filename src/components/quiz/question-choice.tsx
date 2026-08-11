import { useState } from "react"
import { QuizFeedback } from "@/components/quiz/quiz-feedback"
import { displayFor } from "@/features/quiz/build"
import type { ChoiceQuestion } from "@/features/quiz/types"
import type { QuestionHandlers } from "./question-props"

const ASK_LABELS = {
  meaning: "Apa artinya?",
  hanzi: "Hanzi mana yang berarti ini?",
  pinyin: "Bagaimana cara membacanya?",
} as const

/**
 * One prompt, a handful of options, one tap.
 *
 * The prompt is a Hanzi in three questions out of four, so it is set in the
 * card's serif at display size; when the question runs the other way the prompt
 * is a meaning and drops to ordinary text, which keeps the Hanzi in the options
 * the largest thing on screen either way.
 */
export function QuestionChoice({
  question,
  onResolve,
  onNext,
}: { question: ChoiceQuestion } & QuestionHandlers) {
  const [picked, setPicked] = useState<number | null>(null)
  const answered = picked !== null
  const correct = picked === question.answerIndex

  function choose(index: number) {
    if (answered) return
    setPicked(index)
    onResolve([
      {
        wordId: question.word.id,
        hanzi: question.word.hanzi,
        correct: index === question.answerIndex,
      },
    ])
  }

  return (
    <div>
      <p className="eyebrow text-muted-foreground">
        {ASK_LABELS[question.ask]}
      </p>

      <div className="mt-4 flex min-h-[9rem] items-center justify-center border-2 border-foreground bg-card px-6 py-8 text-center">
        {question.promptIsHanzi ? (
          <span className="hanzi text-6xl sm:text-7xl">{question.prompt}</span>
        ) : (
          <span className="text-2xl font-medium">{question.prompt}</span>
        )}
      </div>

      <div
        data-testid="quiz-options"
        className="mt-4 grid gap-2 sm:grid-cols-2"
      >
        {question.options.map((option, index) => {
          const isAnswer = index === question.answerIndex
          const isPicked = index === picked

          // After answering, the right option is always marked — including when
          // it was not the one chosen. That is the whole lesson of a wrong turn.
          const tone = !answered
            ? "border-border bg-card hover:border-foreground"
            : isAnswer
              ? "border-correct bg-card text-correct"
              : isPicked
                ? "border-destructive bg-card text-destructive"
                : "border-border bg-card text-muted-foreground opacity-60"

          return (
            <button
              key={option}
              type="button"
              disabled={answered}
              onClick={() => choose(index)}
              aria-label={option}
              className={`min-h-14 border px-4 py-3 text-center transition-colors disabled:cursor-default ${tone}`}
            >
              <span
                className={
                  question.ask === "hanzi" ? "hanzi text-3xl" : "text-base"
                }
              >
                {option}
              </span>
            </button>
          )
        })}
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
              — {displayFor(question.word, "meaning")}
            </>
          }
          onNext={onNext}
        />
      ) : null}
    </div>
  )
}
