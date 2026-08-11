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

/**
 * Asks how many words to draw when the learner has selected none.
 *
 * The count is validated by `createStudySession`, so the dialog reports
 * whatever that throws instead of duplicating the bounds check.
 */
export function SessionSizeDialog({
  maxCount,
  onStart,
}: {
  maxCount: number
  onStart: (count: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState("20")
  const [error, setError] = useState<string | null>(null)
  const inputId = useId()
  const errorId = `${inputId}-error`

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    try {
      onStart(Number(value))
      setOpen(false)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Jumlah kartu tidak valid."
      )
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setError(null)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Mulai sesi acak</Button>
      </DialogTrigger>
      <DialogContent>
        {/*
          `noValidate`: the bounds live in createStudySession, and the browser's
          own constraint bubble would block submit before our message renders.
        */}
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Sesi acak</DialogTitle>
            <DialogDescription>
              Ambil kata secara acak dari seluruh {maxCount} kata HSK 4.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 grid gap-2">
            <Label htmlFor={inputId}>Jumlah kartu</Label>
            <Input
              id={inputId}
              type="number"
              inputMode="numeric"
              min={1}
              max={maxCount}
              value={value}
              onChange={(event) => {
                setValue(event.target.value)
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
            <Button type="submit">Mulai belajar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
