import { useState } from "react"
import { QuizFeedback } from "@/components/quiz/quiz-feedback"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatSenses } from "@/features/vocabulary/format"
import { isTypedPinyinCorrect } from "@/features/quiz/grade"
import type { TypingQuestion } from "@/features/quiz/types"
import type { QuestionHandlers } from "./question-props"

/**
 * Recall with nothing to recognise: type the reading from the character alone.
 *
 * Tones are not required — `isTypedPinyinCorrect` forgives them, along with
 * spacing, case, and `v` for `ü`. The card still shows the tone-marked pinyin
 * in the feedback, so the right form is what the learner reads even when a
 * looser one was accepted.
 */
export function QuestionTyping({
  question,
  onResolve,
  onNext,
}: { question: TypingQuestion } & QuestionHandlers) {
  const [typed, setTyped] = useState("")
  const [submitted, setSubmitted] = useState<string | null>(null)

  const answered = submitted !== null
  const correct = answered && isTypedPinyinCorrect(submitted, question.word)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (answered || typed.trim() === "") return

    setSubmitted(typed)
    onResolve([
      {
        wordId: question.word.id,
        hanzi: question.word.hanzi,
        correct: isTypedPinyinCorrect(typed, question.word),
      },
    ])
  }

  return (
    <div>
      <p className="eyebrow text-muted-foreground">
        Ketik pinyinnya — nada boleh diabaikan
      </p>

      <div className="mt-4 flex min-h-[9rem] items-center justify-center border-2 border-foreground bg-card px-6 py-8">
        <span className="hanzi text-6xl sm:text-7xl">
          {question.word.hanzi}
        </span>
      </div>

      <form onSubmit={submit} className="mt-4 flex items-start gap-2">
        <Input
          autoFocus
          value={typed}
          disabled={answered}
          onChange={(event) => setTyped(event.target.value)}
          placeholder="mis. ni hao"
          aria-label="Jawaban pinyin"
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
        <QuizFeedback
          correct={correct}
          answer={
            <>
              Jawaban benar:{" "}
              <span className="font-medium">{question.word.pinyin}</span>{" "}
              <span className="text-muted-foreground">
                ({formatSenses(question.word.translationId)})
              </span>
            </>
          }
          onNext={onNext}
        />
      ) : null}
    </div>
  )
}
