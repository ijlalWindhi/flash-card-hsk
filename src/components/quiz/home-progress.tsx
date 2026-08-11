import { useEffect, useState } from "react"
import { QuizStartDialog } from "@/components/quiz/quiz-start-dialog"
import { Button } from "@/components/ui/button"
import {
  getProgressSummaryFn,
  getReviewWordIdsFn,
} from "@/features/quiz/quiz.functions"
import { dayKey } from "@/features/quiz/streak"
import { DAILY_TARGET } from "@/features/quiz/types"
import type { QuizDeck } from "@/features/quiz/session"
import type { ProgressSummary } from "@/features/quiz/progress.types"
import type { VocabularyItem } from "@/features/vocabulary/types"

/** How many troublesome words a review session draws from. */
const REVIEW_POOL = 40

/**
 * The signed-in learner's standing, and the fastest way to improve it.
 *
 * Fetched after hydration rather than in the route loader because the day
 * boundary belongs to the learner's own clock — a server-rendered "hari ini"
 * would be wrong for anyone whose midnight is not UTC's.
 *
 * Renders nothing at all for guests. An empty progress panel inviting someone
 * to sign in would compete with the vocabulary list for the top of the page,
 * and the quiz makes that case far better at the moment a result appears.
 */
export function HomeProgress({
  items,
  onStart,
}: {
  items: Array<VocabularyItem>
  onStart: (deck: QuizDeck) => void
}) {
  const [summary, setSummary] = useState<ProgressSummary | null>(null)
  const [reviewWords, setReviewWords] = useState<Array<VocabularyItem>>([])

  useEffect(() => {
    let active = true

    void getProgressSummaryFn({ data: { today: dayKey(new Date()) } })
      .then((result) => {
        if (active) setSummary(result)
      })
      .catch(() => {
        if (active) setSummary(null)
      })

    void getReviewWordIdsFn({ data: { limit: REVIEW_POOL } })
      .then((ids) => {
        if (!active) return
        const byId = new Map(items.map((item) => [item.id, item]))
        setReviewWords(
          ids
            .map((id) => byId.get(id))
            .filter((item): item is VocabularyItem => item !== undefined)
        )
      })
      .catch(() => {
        if (active) setReviewWords([])
      })

    return () => {
      active = false
    }
  }, [items])

  if (!summary) return null

  const done = Math.min(summary.answeredToday, DAILY_TARGET)
  const metTarget = summary.answeredToday >= DAILY_TARGET

  return (
    <section className="mt-8 border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-mark">
            {summary.dailyStreak > 0
              ? `${summary.dailyStreak} hari beruntun`
              : "Mulai hari beruntunmu"}
          </p>
          <p className="mt-2 text-sm">
            {metTarget
              ? `Target hari ini tercapai — ${summary.answeredToday} soal.`
              : `${summary.answeredToday} dari ${DAILY_TARGET} soal hari ini.`}
          </p>

          <div
            className="mt-3 h-0.5 w-48 max-w-full bg-border"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={DAILY_TARGET}
            aria-valuenow={done}
            aria-label="Target harian"
          >
            <div
              className={`h-full transition-[width] duration-500 ${metTarget ? "bg-correct" : "bg-foreground"}`}
              style={{ width: `${(done / DAILY_TARGET) * 100}%` }}
            />
          </div>
        </div>

        {reviewWords.length > 0 ? (
          <QuizStartDialog
            candidates={reviewWords}
            source="review"
            trigger={
              <Button variant="outline">
                Latih {reviewWords.length} kata yang sering salah
              </Button>
            }
            onStart={onStart}
          />
        ) : null}
      </div>

      {summary.badges.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {summary.badges.map((badge) => (
            <li
              key={badge.id}
              title={badge.description}
              className="border border-border px-2 py-1 text-xs text-muted-foreground"
            >
              {badge.name}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
