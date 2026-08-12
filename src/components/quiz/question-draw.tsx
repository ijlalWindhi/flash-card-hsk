import { useState } from "react"
import { HanziPad } from "@/components/quiz/hanzi-pad"
import { QuizFeedback } from "@/components/quiz/quiz-feedback"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatSenses } from "@/features/vocabulary/format"
import { isTypedMeaningCorrect } from "@/features/quiz/grade"
import type { DrawQuestion } from "@/features/quiz/types"
import type { QuestionHandlers } from "./question-props"

/**
 * Production from sound alone: hear the reading, recall what it means, and write
 * the character.
 *
 * Only the meaning is graded. Comparing handwriting against a printed glyph is
 * not something this app can judge fairly — a correct character in an unsteady
 * hand would read as a failure — so the drawing is left to the learner to mark
 * themselves, which is what the reveal is for. The character appears after every
 * answer, right or wrong: a learner who missed the meaning may still have drawn
 * the character perfectly, and hiding it would take away the one thing they came
 * to this mode for.
 *
 * Nothing about the drawing gates the submit button. Blocking on ink would
 * punish exactly the learner who cannot picture the character yet, which is the
 * learner the reveal exists to teach.
 */
export function QuestionDraw({
  question,
  onResolve,
  onNext,
}: { question: DrawQuestion } & QuestionHandlers) {
  const [typed, setTyped] = useState("")
  const [submitted, setSubmitted] = useState<string | null>(null)

  const answered = submitted !== null
  const correct = answered && isTypedMeaningCorrect(submitted, question.word)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (answered || typed.trim() === "") return

    setSubmitted(typed)
    onResolve([
      {
        wordId: question.word.id,
        hanzi: question.word.hanzi,
        correct: isTypedMeaningCorrect(typed, question.word),
      },
    ])
  }

  return (
    <div>
      <p className="eyebrow text-muted-foreground">
        Tulis hanzinya, lalu ketik artinya
      </p>

      <div className="mt-4 flex min-h-[9rem] flex-col items-center justify-center gap-2 border-2 border-foreground bg-card px-6 py-8 text-center">
        {answered ? (
          <span
            data-testid="draw-reveal"
            className="hanzi text-6xl sm:text-7xl"
          >
            {question.word.hanzi}
          </span>
        ) : null}

        <span
          className={
            answered
              ? "text-base text-muted-foreground"
              : "text-4xl font-medium sm:text-5xl"
          }
        >
          {question.word.pinyin}
        </span>

        {answered ? (
          <span className="text-sm text-muted-foreground">
            {formatSenses(question.word.translationId)}
          </span>
        ) : null}
      </div>

      {answered ? (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Bandingkan hanzi di atas dengan tulisanmu.
        </p>
      ) : null}

      <div className="mt-5">
        <HanziPad />
      </div>

      <form onSubmit={submit} className="mt-5 flex items-start gap-2">
        <Input
          autoFocus
          value={typed}
          disabled={answered}
          onChange={(event) => setTyped(event.target.value)}
          placeholder="mis. bepergian"
          aria-label="Arti dalam bahasa Indonesia"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="flex-1"
        />
        <Button type="submit" disabled={answered || typed.trim() === ""}>
          Periksa
        </Button>
      </form>

      {answered ? (
        <QuizFeedback correct={correct} autoAdvance={false} onNext={onNext} />
      ) : null}
    </div>
  )
}
