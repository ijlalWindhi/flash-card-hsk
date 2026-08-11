import { Link, createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { EmptyState } from "@/components/empty-state"
import { QuizRunner } from "@/components/quiz/quiz-runner"
import { Skeleton } from "@/components/ui/skeleton"
import { minimumWordsFor } from "@/features/quiz/build"
import { readQuizDeck, storeQuizDeck } from "@/features/quiz/session"
import { MODE_LABELS } from "@/features/quiz/types"
import type { QuizDeck } from "@/features/quiz/session"
import type { VocabularyItem } from "@/features/vocabulary/types"

export const Route = createFileRoute("/quiz")({ component: QuizPage })

function QuizPage() {
  // `undefined` means "not read yet": session storage only exists after
  // hydration, so the first server render cannot know whether a deck is there.
  const [deck, setDeck] = useState<QuizDeck | null | undefined>(undefined)

  useEffect(() => {
    setDeck(readQuizDeck())
  }, [])

  if (deck === undefined) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 py-16">
        <Skeleton className="h-[26rem] w-full" />
      </main>
    )
  }

  if (deck === null) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 py-20">
        <EmptyState
          eyebrow="Quiz"
          title="Sesi quiz tidak ditemukan"
          description="Sesi quiz hanya tersimpan di tab ini. Pilih kata lagi untuk memulai quiz baru."
          action={
            <Link
              to="/"
              className="inline-block text-sm underline underline-offset-4"
            >
              Kembali ke daftar kosa kata
            </Link>
          }
        />
      </main>
    )
  }

  return <QuizSession deck={deck} onDeckChange={setDeck} />
}

/**
 * The page once a deck is known to exist.
 *
 * Split out so the deck is non-nullable throughout: the retry handler needs it,
 * and narrowing a piece of state does not survive into a callback the way a
 * prop does.
 */
function QuizSession({
  deck,
  onDeckChange,
}: {
  deck: QuizDeck
  onDeckChange: (deck: QuizDeck) => void
}) {
  /** Bumped to remount the runner, which rebuilds and reshuffles the questions. */
  const [run, setRun] = useState(0)

  /**
   * Starts a fresh quiz over the words that were missed.
   *
   * The mode carries over when the shorter deck can still support it. Three
   * missed words cannot fill a matching board, and refusing the retry over a
   * technicality would be worse than quietly asking them to be typed instead —
   * typing works from a single word and is the harder test anyway.
   */
  function retryWrong(words: Array<VocabularyItem>) {
    if (words.length === 0) return

    const next: QuizDeck = {
      words,
      mode: words.length >= minimumWordsFor(deck.mode) ? deck.mode : "typing",
      source: deck.source,
    }

    storeQuizDeck(next)
    onDeckChange(next)
    setRun((current) => current + 1)
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pt-10 pb-16">
      <div className="flex items-baseline justify-between gap-4">
        <Link to="/" className="eyebrow text-muted-foreground no-underline">
          ← Daftar kosa kata
        </Link>
        <p className="eyebrow text-mark">{MODE_LABELS[deck.mode]}</p>
      </div>

      <div className="mt-6">
        <QuizRunner
          key={`${run}-${deck.mode}-${deck.words.length}`}
          deck={deck}
          onRetryWrong={retryWrong}
          onRestart={() => setRun((current) => current + 1)}
        />
      </div>
    </main>
  )
}
