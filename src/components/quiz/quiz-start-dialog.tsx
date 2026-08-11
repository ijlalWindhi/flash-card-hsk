import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { minimumWordsFor, shuffle } from "@/features/quiz/build"
import { MODE_DESCRIPTIONS, MODE_LABELS } from "@/features/quiz/types"
import type { QuizDeck } from "@/features/quiz/session"
import type { QuizMode, QuizSource } from "@/features/quiz/types"
import type { VocabularyItem } from "@/features/vocabulary/types"

const MODES: Array<QuizMode> = ["choice", "match", "typing", "truefalse"]

/** A sensible session: long enough to be worth starting, short enough to finish. */
const DEFAULT_COUNT = 20

/**
 * The one screen every entry point passes through.
 *
 * Modes too big for the deck are shown disabled with the reason rather than
 * hidden — a learner who picked three words should find out that matching needs
 * four, not silently be offered a shorter menu they cannot explain.
 */
export function QuizStartDialog({
  candidates,
  source,
  trigger,
  onStart,
}: {
  /** Every word the session may draw from; sampled down to the chosen count. */
  candidates: Array<VocabularyItem>
  source: QuizSource
  trigger: React.ReactNode
  onStart: (deck: QuizDeck) => void
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<QuizMode>("choice")
  const [count, setCount] = useState(
    String(Math.min(DEFAULT_COUNT, candidates.length))
  )
  const [error, setError] = useState<string | null>(null)

  /**
   * The default follows the current selection, so it is recomputed on open.
   *
   * The dialog lives inside the selection bar, which mounts as soon as the
   * first word is ticked. Without this, ticking a second word would leave the
   * count at one — a number the learner never typed, and one the start button
   * would then reject as out of range.
   */
  function resetCount() {
    setCount(String(Math.min(DEFAULT_COUNT, candidates.length)))
    setError(null)
  }

  const countId = useId()
  const errorId = `${countId}-error`

  function start() {
    const wanted = Number(count)
    if (
      !Number.isInteger(wanted) ||
      wanted < minimumWordsFor(mode) ||
      wanted > candidates.length
    ) {
      setError(
        `Jumlah kata harus antara ${minimumWordsFor(mode)} dan ${candidates.length}.`
      )
      return
    }

    // Sampled here rather than in the quiz page: only the words actually being
    // tested go into session storage, so a random quiz drawn from a thousand
    // words stores twenty, not a thousand.
    onStart({
      words: shuffle(candidates, Math.random).slice(0, wanted),
      mode,
      source,
    })
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) resetCount()
        else setError(null)
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mulai quiz</DialogTitle>
          <DialogDescription>
            Pilih satu mode untuk sesi ini, lalu tentukan berapa kata yang mau
            diuji dari {candidates.length} kata yang tersedia.
          </DialogDescription>
        </DialogHeader>

        <fieldset className="mt-6">
          <legend className="eyebrow text-muted-foreground">Mode</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {MODES.map((option) => {
              const minimum = minimumWordsFor(option)
              const disabled = candidates.length < minimum
              const active = option === mode && !disabled

              return (
                <button
                  key={option}
                  type="button"
                  disabled={disabled}
                  aria-pressed={active}
                  onClick={() => {
                    setMode(option)
                    setError(null)
                  }}
                  className={`border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
                    active
                      ? "border-foreground bg-secondary"
                      : "border-border bg-card hover:border-foreground"
                  }`}
                >
                  <span className="block text-sm font-medium">
                    {MODE_LABELS[option]}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {disabled
                      ? `Butuh minimal ${minimum} kata.`
                      : MODE_DESCRIPTIONS[option]}
                  </span>
                </button>
              )
            })}
          </div>
        </fieldset>

        <div className="mt-6 grid gap-2">
          <Label htmlFor={countId}>Jumlah kata</Label>
          <Input
            id={countId}
            type="number"
            inputMode="numeric"
            min={minimumWordsFor(mode)}
            max={candidates.length}
            value={count}
            onChange={(event) => {
              setCount(event.target.value)
              setError(null)
            }}
            aria-invalid={error !== null}
            aria-describedby={error ? errorId : undefined}
          />
          {error ? (
            <p id={errorId} role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter className="mt-6">
          <Button onClick={start}>Mulai quiz</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
