import { useEffect, useRef, useState } from "react"
import { QuizFeedback } from "@/components/quiz/quiz-feedback"
import type { MatchQuestion } from "@/features/quiz/types"
import type { QuestionHandlers } from "./question-props"

/** How long a mismatched pair stays lit before it lets go. */
const MISMATCH_MS = 600

type Column = "hanzi" | "meaning"
type Selection = { column: Column; pairIndex: number }

/**
 * A board of Hanzi against shuffled meanings, cleared pair by pair.
 *
 * Either column can be tapped first — insisting on Hanzi-then-meaning would be
 * an arbitrary rule the learner has to remember on top of the vocabulary.
 *
 * A word counts as correct only if it was never part of a wrong attempt, so
 * clearing the board by elimination does not read as five words known.
 */
export function QuestionMatch({
  question,
  onResolve,
  onNext,
}: { question: MatchQuestion } & QuestionHandlers) {
  const [selected, setSelected] = useState<Selection | null>(null)
  const [mismatch, setMismatch] = useState<Array<number>>([])
  const [locked, setLocked] = useState<Array<number>>([])
  const [missed, setMissed] = useState<Array<number>>([])

  const solved = locked.length === question.pairs.length
  const flawless = solved && missed.length === 0

  // Resolving is a side effect of the board filling up, and it must happen
  // exactly once even though `locked` changes on every pair.
  const resolved = useRef(false)
  useEffect(() => {
    if (!solved || resolved.current) return
    resolved.current = true

    onResolve(
      question.pairs.map((pair, index) => ({
        wordId: pair.word.id,
        hanzi: pair.word.hanzi,
        correct: !missed.includes(index),
      }))
    )
  }, [solved, missed, question.pairs, onResolve])

  useEffect(() => {
    if (mismatch.length === 0) return
    const timer = setTimeout(() => setMismatch([]), MISMATCH_MS)
    return () => clearTimeout(timer)
  }, [mismatch])

  function tap(column: Column, pairIndex: number) {
    if (locked.includes(pairIndex) || mismatch.length > 0) return

    if (!selected || selected.column === column) {
      setSelected({ column, pairIndex })
      return
    }

    if (selected.pairIndex === pairIndex) {
      setLocked((current) => [...current, pairIndex])
    } else {
      setMismatch([selected.pairIndex, pairIndex])
      setMissed((current) => [
        ...current,
        ...[selected.pairIndex, pairIndex].filter(
          (index) => !current.includes(index)
        ),
      ])
    }
    setSelected(null)
  }

  function tone(pairIndex: number) {
    if (locked.includes(pairIndex)) {
      return "border-correct text-correct opacity-55"
    }
    if (mismatch.includes(pairIndex)) {
      return "border-destructive text-destructive"
    }
    if (selected?.pairIndex === pairIndex) {
      return "border-foreground bg-secondary"
    }
    return "border-border hover:border-foreground"
  }

  return (
    <div>
      <p className="eyebrow text-muted-foreground">
        Jodohkan hanzi dengan artinya — {question.pairs.length - locked.length}{" "}
        pasang tersisa
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
        <ul className="grid content-start gap-2">
          {question.pairs.map((pair, pairIndex) => (
            <li key={pair.word.id}>
              <button
                type="button"
                disabled={locked.includes(pairIndex)}
                onClick={() => tap("hanzi", pairIndex)}
                aria-pressed={selected?.pairIndex === pairIndex}
                className={`hanzi min-h-16 w-full border bg-card px-3 py-3 text-3xl transition-colors disabled:cursor-default ${tone(pairIndex)}`}
              >
                {pair.word.hanzi}
              </button>
            </li>
          ))}
        </ul>

        <ul className="grid content-start gap-2">
          {question.meaningOrder.map((pairIndex) => (
            <li key={question.pairs[pairIndex].word.id}>
              <button
                type="button"
                disabled={locked.includes(pairIndex)}
                onClick={() => tap("meaning", pairIndex)}
                aria-pressed={selected?.pairIndex === pairIndex}
                className={`flex min-h-16 w-full items-center border bg-card px-3 py-3 text-left text-sm transition-colors disabled:cursor-default ${tone(pairIndex)}`}
              >
                {question.pairs[pairIndex].meaning}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {solved ? (
        <QuizFeedback
          correct={flawless}
          answer={`${missed.length} kata sempat tertukar. Perhatikan lagi di ringkasan nanti.`}
          onNext={onNext}
        />
      ) : null}
    </div>
  )
}
