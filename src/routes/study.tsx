import { Link, createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { EmptyState } from "@/components/empty-state"
import { StudyCard } from "@/components/study-card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { StudySession } from "@/features/flashcards/session"
import { readStudySession } from "@/features/flashcards/session"

export const Route = createFileRoute("/study")({ component: StudyPage })

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

function StudyPage() {
  // `undefined` means "not read yet": session storage only exists after
  // hydration, so the first server render cannot know whether a deck is there.
  const [session, setSession] = useState<StudySession | null | undefined>(
    undefined
  )
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    setSession(readStudySession())
  }, [])

  if (session === undefined) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 py-16">
        <Skeleton className="h-[22rem] w-full" />
      </main>
    )
  }

  if (session === null) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 py-20">
        <EmptyState
          eyebrow="Sesi belajar"
          title="Sesi tidak ditemukan"
          description="Sesi belajar hanya tersimpan di tab ini. Pilih kata lagi untuk memulai sesi baru."
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

  const card = session.cards[index]
  const isFirst = index === 0
  const isLast = index === session.cards.length - 1

  function move(delta: number) {
    setIndex((current) => current + delta)
    // Every card starts face down, however you arrived at it.
    setRevealed(false)
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pt-10 pb-16">
      <div className="flex items-baseline justify-between gap-4">
        <Link to="/" className="eyebrow text-muted-foreground no-underline">
          ← Daftar kosa kata
        </Link>
        <p data-testid="study-progress" className="eyebrow tabular-nums">
          {pad(index + 1)} / {pad(session.cards.length)}
        </p>
      </div>

      <div className="mt-6">
        <StudyCard
          card={card}
          revealed={revealed}
          onFlip={() => setRevealed((current) => !current)}
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <Button variant="outline" disabled={isFirst} onClick={() => move(-1)}>
          Sebelumnya
        </Button>
        <p className="eyebrow text-muted-foreground">
          {session.source === "random" ? "Acak" : "Pilihanmu"}
        </p>
        <Button variant="outline" disabled={isLast} onClick={() => move(1)}>
          Berikutnya
        </Button>
      </div>
    </main>
  )
}
