import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { formatSenses } from "@/features/vocabulary/format"
import { MODE_LABELS } from "@/features/quiz/types"
import type { RecordedResult } from "@/features/quiz/progress.types"
import type { QuizOutcome } from "@/features/quiz/types"

export type SaveState =
  | { status: "saving" }
  | { status: "saved"; progress: RecordedResult }
  | { status: "guest" }
  | { status: "error" }

function encouragement(ratio: number): string {
  if (ratio === 1) return "Sempurna. Semua benar."
  if (ratio >= 0.8) return "Bagus — tinggal sedikit lagi."
  if (ratio >= 0.5) return "Sudah setengah jalan. Ulangi yang salah."
  return "Belum apa-apa. Ulangi pelan-pelan, ini cara belajarnya."
}

/**
 * The end of a session, and the start of the next one.
 *
 * The score is stated once and then left alone; the page's real work is the
 * list of missed words with their answers, and a button that turns that list
 * into the next quiz. A result screen that only reports a number ends the
 * session — this one is meant to continue it.
 */
export function QuizResult({
  outcome,
  save,
  onRetryWrong,
  onRestart,
}: {
  outcome: QuizOutcome
  save: SaveState
  onRetryWrong: () => void
  onRestart: () => void
}) {
  const ratio = outcome.total === 0 ? 0 : outcome.correct / outcome.total
  const percentage = Math.round(ratio * 100)

  return (
    <div>
      <p className="eyebrow text-mark">Hasil · {MODE_LABELS[outcome.mode]}</p>

      <div className="mt-4 border-2 border-foreground bg-card px-6 py-10 text-center">
        <p className="text-5xl font-medium tabular-nums">
          {outcome.correct}
          <span className="text-muted-foreground">/{outcome.total}</span>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {percentage}% benar · beruntun terbaik {outcome.bestStreak}
        </p>
        <p className="mt-4 text-base">{encouragement(ratio)}</p>
      </div>

      {save.status === "saved" ? (
        <div className="mt-4 border-l-2 border-correct py-3 pl-4">
          <p className="eyebrow text-correct">Progres tersimpan</p>
          <p className="mt-1 text-sm">
            {save.progress.dailyStreak} hari beruntun ·{" "}
            {save.progress.answeredToday} soal hari ini
          </p>
          {save.progress.newBadges.length > 0 ? (
            <ul className="mt-3 grid gap-2">
              {save.progress.newBadges.map((badge) => (
                <li key={badge.id} className="border border-border bg-card p-3">
                  <p className="eyebrow text-mark">Lencana baru</p>
                  <p className="mt-1 text-sm font-medium">{badge.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {badge.description}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {save.status === "guest" ? (
        <div className="mt-4 border border-border bg-card p-4">
          <p className="text-sm">
            Hasil ini belum tersimpan.{" "}
            <Link to="/masuk" className="underline underline-offset-4">
              Masuk
            </Link>{" "}
            atau{" "}
            <Link to="/daftar" className="underline underline-offset-4">
              daftar
            </Link>{" "}
            untuk melacak kata yang sering salah dan menjaga hari beruntunmu.
          </p>
        </div>
      ) : null}

      {save.status === "error" ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Hasil tidak berhasil disimpan ke server. Skormu di atas tetap benar.
        </p>
      ) : null}

      {outcome.wrongWords.length > 0 ? (
        <section className="mt-8">
          <h2 className="eyebrow text-muted-foreground">
            {outcome.wrongWords.length} kata untuk diulang
          </h2>
          <ul className="mt-3 grid gap-2">
            {outcome.wrongWords.map((word) => (
              <li
                key={word.id}
                className="flex items-baseline gap-4 border border-border bg-card p-3"
              >
                <span className="hanzi shrink-0 text-2xl">{word.hanzi}</span>
                <span className="min-w-0">
                  <span className="block text-sm text-muted-foreground">
                    {word.pinyin}
                  </span>
                  <span className="block text-sm font-medium">
                    {formatSenses(word.translationId)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-2">
        {outcome.wrongWords.length > 0 ? (
          <Button onClick={onRetryWrong}>
            Ulangi {outcome.wrongWords.length} kata yang salah
          </Button>
        ) : null}
        <Button variant="outline" onClick={onRestart}>
          Ulangi sesi ini
        </Button>
        <Button variant="outline" asChild>
          <Link to="/">Kembali ke daftar</Link>
        </Button>
      </div>
    </div>
  )
}
