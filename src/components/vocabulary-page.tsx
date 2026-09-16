import { useNavigate, useRouter } from "@tanstack/react-router"
import { useCallback, useMemo, useState } from "react"
import { EmptyState } from "@/components/empty-state"
import { HomeProgress } from "@/components/quiz/home-progress"
import { QuizStartDialog } from "@/components/quiz/quiz-start-dialog"
import { SessionSizeDialog } from "@/components/session-size-dialog"
import { Button } from "@/components/ui/button"
import { VocabularyList } from "@/components/vocabulary-list"
import {
  createStudySession,
  storeStudySession,
} from "@/features/flashcards/session"
import { storeQuizDeck } from "@/features/quiz/session"
import { syllabusPath } from "@/features/vocabulary/syllabus"
import type { QuizDeck } from "@/features/quiz/session"
import type { Syllabus } from "@/features/vocabulary/syllabus"
import type { VocabularyItem } from "@/features/vocabulary/types"

/**
 * The word list, shared by both syllabuses.
 *
 * `items` arrives as a prop rather than from a loader hook: the two routes that
 * render this have their own loaders, and `Route.useLoaderData()` is bound to
 * one of them.
 */
export function VocabularyPage({
  syllabus,
  items,
}: {
  syllabus: Syllabus
  items: Array<VocabularyItem>
}) {
  const navigate = useNavigate()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

  const toggle = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }, [])

  /**
   * Builds the deck and hands off to the study page.
   *
   * `createStudySession` throws for an out-of-range count; the dialog catches
   * that and shows the message, so navigation only happens on a valid deck.
   */
  function startSession(randomCount: number | null) {
    const session = createStudySession(
      items,
      [...selectedIds],
      randomCount,
      Math.random
    )
    storeStudySession(syllabus.id, session)
    void navigate({ to: syllabusPath(syllabus, "study") })
  }

  /** Stores the deck and hands off to the quiz page. */
  function startQuiz(deck: QuizDeck) {
    storeQuizDeck(syllabus.id, deck)
    void navigate({ to: syllabusPath(syllabus, "quiz") })
  }

  const selectedCount = selectedIds.size
  const selectedWords = useMemo(
    () => items.filter((item) => selectedIds.has(item.id)),
    [items, selectedIds]
  )

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pt-10 pb-32">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {/* These are the words the syllabus *introduces* at level 4, not the
              cumulative list — worth saying once, near the title. */}
          <p className="eyebrow text-mark">
            {syllabus.name} · tingkat 4 · {items.length} kata baru
          </p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight">
            Daftar kosa kata
          </h1>
          <p className="mt-2 max-w-prose text-sm text-muted-foreground">
            Pilih kata yang ingin dihafal, lalu mulai sesi belajar atau langsung
            uji dengan quiz. Belum tahu mau mulai dari mana? Ambil beberapa kata
            secara acak.
          </p>
        </div>
        {selectedCount === 0 ? (
          <div className="flex flex-wrap gap-2">
            <SessionSizeDialog maxCount={items.length} onStart={startSession} />
            <QuizStartDialog
              candidates={items}
              source="random"
              trigger={<Button>Quiz acak</Button>}
              onStart={startQuiz}
            />
          </div>
        ) : null}
      </div>

      <HomeProgress items={items} onStart={startQuiz} />

      <VocabularyList
        items={items}
        selectedIds={selectedIds}
        onToggle={toggle}
      />

      {selectedCount > 0 ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-foreground bg-primary text-primary-foreground">
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-3">
            <p className="text-sm">
              <span className="font-medium">{selectedCount}</span> kata dipilih
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-xs underline underline-offset-4 opacity-80 hover:opacity-100"
              >
                Kosongkan
              </button>
              <QuizStartDialog
                candidates={selectedWords}
                source="selected"
                trigger={
                  <Button variant="secondary">Quiz {selectedCount} kata</Button>
                }
                onStart={startQuiz}
              />
              <Button variant="secondary" onClick={() => startSession(null)}>
                Belajar {selectedCount} kartu
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

export function VocabularyUnavailable() {
  const router = useRouter()

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-20">
      <EmptyState
        eyebrow="Gagal memuat"
        title="Daftar kosa kata tidak bisa dimuat"
        description="Aplikasi tidak dapat menghubungi basis data. Daftar kata tidak kosong — hanya belum berhasil diambil."
        action={
          <Button onClick={() => void router.invalidate()}>
            Coba muat ulang
          </Button>
        }
      />
    </main>
  )
}
