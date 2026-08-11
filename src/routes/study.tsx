import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { EmptyState } from "@/components/empty-state"
import { QuizStartDialog } from "@/components/quiz/quiz-start-dialog"
import { StudyCard } from "@/components/study-card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { storeQuizDeck } from "@/features/quiz/session"
import { seo } from "@/lib/seo"
import type { StudySession } from "@/features/flashcards/session"
import { readStudySession } from "@/features/flashcards/session"

export const Route = createFileRoute("/study")({
  component: StudyPage,
  head: () =>
    seo({
      title: "Flashcard HSK 4 — Hafalkan Hanzi Satu per Satu",
      description:
        "Latihan flashcard kosa kata HSK 4. Kartu menampilkan hanzi lebih dulu — balik untuk melihat pinyin dan artinya. Atur jumlah kartu tiap sesi.",
      path: "/study",
    }),
})

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
  const navigate = useNavigate()

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

      {/*
        The deck is finished, and recognising a word face-up is not the same as
        recalling it. This is the moment that offer lands best, so it appears in
        place rather than as something to go and find.
      */}
      {isLast ? (
        <div className="mt-10 border-2 border-foreground bg-card p-6">
          <p className="eyebrow text-mark">Deck selesai</p>
          <h2 className="mt-2 text-xl font-medium tracking-tight">
            Sudah hafal {session.cards.length} kata ini?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Uji dengan quiz singkat — jawabannya tidak akan terlihat sampai kamu
            menebak.
          </p>
          <div className="mt-5">
            <QuizStartDialog
              candidates={session.cards}
              source="flashcard"
              trigger={<Button>Uji kata-kata ini</Button>}
              onStart={(deck) => {
                storeQuizDeck(deck)
                void navigate({ to: "/quiz" })
              }}
            />
          </div>
        </div>
      ) : null}
    </main>
  )
}
