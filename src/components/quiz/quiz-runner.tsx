import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { QuestionChoice } from "@/components/quiz/question-choice"
import { QuestionDraw } from "@/components/quiz/question-draw"
import { QuestionMatch } from "@/components/quiz/question-match"
import { QuestionTrueFalse } from "@/components/quiz/question-truefalse"
import { QuestionTyping } from "@/components/quiz/question-typing"
import { QuizResult } from "@/components/quiz/quiz-result"
import { buildQuiz } from "@/features/quiz/build"
import { summariseQuiz } from "@/features/quiz/grade"
import { recordQuizResultFn } from "@/features/quiz/quiz.functions"
import { dayKey } from "@/features/quiz/streak"
import { SOURCE_LABELS } from "@/features/quiz/types"
import type { QuizDeck } from "@/features/quiz/session"
import type { QuizQuestion, WordOutcome } from "@/features/quiz/types"
import type { VocabularyItem } from "@/features/vocabulary/types"
import type { QuestionHandlers } from "@/components/quiz/question-props"
import type { SaveState } from "@/components/quiz/quiz-result"

/**
 * Runs one quiz from first question to result screen.
 *
 * The runner owns only what spans questions — position, the record of answers,
 * and the live streak. Each mode's component owns its own interaction and
 * feedback, which is why adding a fifth mode would touch this file in exactly
 * one place: the switch at the bottom.
 */
export function QuizRunner({
  deck,
  onRetryWrong,
  onRestart,
}: {
  deck: QuizDeck
  onRetryWrong: (words: Array<VocabularyItem>) => void
  onRestart: () => void
}) {
  // Built once per mount. A remount — which is what "ulangi sesi ini" does via
  // its key — reshuffles, so repeating a session is never the identical quiz.
  const questions = useMemo(
    () => buildQuiz(deck.words, deck.mode, deck.words.length, Math.random),
    [deck]
  )

  const [index, setIndex] = useState(0)
  const [outcomes, setOutcomes] = useState<Array<WordOutcome>>([])
  const [finished, setFinished] = useState(false)
  const [save, setSave] = useState<SaveState>({ status: "saving" })

  const resolve = useCallback((results: Array<WordOutcome>) => {
    setOutcomes((current) => [...current, ...results])
  }, [])

  const next = useCallback(() => {
    setIndex((current) => {
      if (current + 1 >= questions.length) {
        setFinished(true)
        return current
      }
      return current + 1
    })
  }, [questions.length])

  const outcome = useMemo(
    () => summariseQuiz(deck.mode, deck.source, outcomes, deck.words),
    [deck.mode, deck.source, deck.words, outcomes]
  )

  // Sent once, when the quiz ends. The result screen renders from local state
  // either way, so a slow or failed request never blocks the learner.
  //
  // The ref, not the dependency list, is what guarantees "once": a re-render
  // that hands back a new `outcome` object would otherwise record the same
  // session twice and inflate the learner's own statistics.
  const submitted = useRef(false)
  useEffect(() => {
    if (!finished || submitted.current) return
    submitted.current = true
    let active = true

    void recordQuizResultFn({
      data: {
        mode: outcome.mode,
        source: outcome.source,
        bestStreak: outcome.bestStreak,
        dayKey: dayKey(new Date()),
        words: outcome.words,
      },
    })
      .then((response) => {
        if (!active) return
        setSave(
          response.saved
            ? { status: "saved", progress: response.progress }
            : { status: response.reason === "guest" ? "guest" : "error" }
        )
      })
      .catch(() => {
        if (active) setSave({ status: "error" })
      })

    return () => {
      active = false
    }
  }, [finished, outcome])

  if (finished) {
    return (
      <QuizResult
        outcome={outcome}
        save={save}
        onRetryWrong={() => onRetryWrong(outcome.wrongWords)}
        onRestart={onRestart}
      />
    )
  }

  const question = questions[index]
  const streak = trailingStreak(outcomes)
  const handlers = { onResolve: resolve, onNext: next }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="eyebrow text-muted-foreground">
          {SOURCE_LABELS[deck.source]}
        </p>
        <p data-testid="quiz-progress" className="eyebrow tabular-nums">
          {index + 1} / {questions.length}
        </p>
      </div>

      <div
        className="mt-2 h-0.5 w-full bg-border"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={questions.length}
        aria-valuenow={index}
        aria-label="Kemajuan quiz"
      >
        <div
          className="h-full bg-foreground transition-[width] duration-300"
          style={{ width: `${(index / questions.length) * 100}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground tabular-nums">
          {outcomes.filter((item) => item.correct).length} benar
        </p>
        {/* The streak only appears once it is worth protecting. */}
        {streak >= 2 ? (
          <p
            data-testid="quiz-streak"
            className="eyebrow text-mark tabular-nums"
          >
            {streak} beruntun
          </p>
        ) : null}
      </div>

      <div className="mt-6">{renderQuestion(question, handlers)}</div>
    </div>
  )
}

/**
 * One arm per question kind.
 *
 * A switch rather than the chain of ternaries this replaced: at five modes the
 * chain no longer read as a list, and its final `else` silently owned whatever
 * kind was added next. Here the compiler checks the list is complete, so a sixth
 * mode is a type error rather than a blank card at question seven.
 */
function renderQuestion(question: QuizQuestion, handlers: QuestionHandlers) {
  switch (question.kind) {
    case "choice":
      return (
        <QuestionChoice key={question.id} question={question} {...handlers} />
      )
    case "match":
      return (
        <QuestionMatch key={question.id} question={question} {...handlers} />
      )
    case "typing":
      return (
        <QuestionTyping key={question.id} question={question} {...handlers} />
      )
    case "truefalse":
      return (
        <QuestionTrueFalse
          key={question.id}
          question={question}
          {...handlers}
        />
      )
    case "draw":
      return (
        <QuestionDraw key={question.id} question={question} {...handlers} />
      )
  }
}

/** Correct answers at the end of the record — the run currently at stake. */
function trailingStreak(outcomes: Array<WordOutcome>): number {
  let run = 0
  for (let i = outcomes.length - 1; i >= 0; i -= 1) {
    if (!outcomes[i].correct) break
    run += 1
  }
  return run
}
