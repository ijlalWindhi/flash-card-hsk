import { useEffect, useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type {
  FieldError,
  ManualVocabularyInput,
} from "@/features/admin/vocabulary.schemas"
import {
  manualVocabularySchema,
  toFieldErrors,
} from "@/features/admin/vocabulary.schemas"
import type { VocabularyItem } from "@/features/vocabulary/types"
import { useHydrated } from "@/lib/use-hydrated"

const EMPTY: ManualVocabularyInput = {
  hanzi: "",
  pinyin: "",
  translationId: "",
  translationEn: "",
}

const FIELDS = [
  { name: "hanzi", label: "Hanzi", hint: "Bentuk sederhana, contoh 例词." },
  { name: "pinyin", label: "Pinyin", hint: "Dengan tanda nada, contoh lìcí." },
  {
    name: "translationId",
    label: "Arti Indonesia",
    hint: "Pisahkan makna dengan ;",
  },
  {
    name: "translationEn",
    label: "Arti Inggris",
    hint: "Pisahkan makna dengan ;",
  },
] as const

/**
 * Creates or edits one manual word.
 *
 * Validates with the same schema the server uses, so an obvious mistake is
 * caught without a round trip. Submitted values survive a failure: retyping
 * four fields because one was wrong is the fastest way to lose an editor.
 */
export function AdminVocabularyForm({
  editing,
  onSubmit,
  onCancelEdit,
}: {
  editing: VocabularyItem | null
  onSubmit: (input: ManualVocabularyInput) => Promise<Array<FieldError> | null>
  onCancelEdit: () => void
}) {
  const [values, setValues] = useState<ManualVocabularyInput>(EMPTY)
  const [errors, setErrors] = useState<Array<FieldError>>([])
  const [pending, setPending] = useState(false)
  const hydrated = useHydrated()
  const formId = useId()

  useEffect(() => {
    setValues(
      editing
        ? {
            hanzi: editing.hanzi,
            pinyin: editing.pinyin,
            translationId: editing.translationId,
            translationEn: editing.translationEn,
          }
        : EMPTY
    )
    setErrors([])
  }, [editing])

  function errorFor(field: string): string | undefined {
    return errors.find((error) => error.field === field)?.message
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const parsed = manualVocabularySchema.safeParse(values)
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error))
      return
    }

    setPending(true)
    const failures = await onSubmit(parsed.data)
    setPending(false)

    if (failures) {
      setErrors(failures)
      return
    }
    setErrors([])
    if (!editing) setValues(EMPTY)
  }

  const formError = errorFor("form")

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/*
        Inert until hydrated: these are controlled inputs, so anything typed
        before React attaches would be invisible to it and submitted as empty.
      */}
      <fieldset
        disabled={!hydrated || pending}
        className="grid gap-4 border-0 p-0 disabled:opacity-70"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((field) => {
            const inputId = `${formId}-${field.name}`
            const message = errorFor(field.name)
            const hintId = `${inputId}-hint`

            return (
              <div key={field.name} className="grid gap-2">
                <Label htmlFor={inputId}>{field.label}</Label>
                <Input
                  id={inputId}
                  value={values[field.name]}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [field.name]: event.target.value,
                    }))
                  }
                  aria-invalid={message !== undefined}
                  aria-describedby={hintId}
                />
                <p
                  id={hintId}
                  className={`text-xs ${message ? "text-destructive" : "text-muted-foreground"}`}
                  role={message ? "alert" : undefined}
                >
                  {message ?? field.hint}
                </p>
              </div>
            )
          })}
        </div>

        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}

        <div className="flex items-center gap-2">
          <Button type="submit">
            {editing ? "Simpan perubahan" : "Tambah kata"}
          </Button>
          {editing ? (
            <Button type="button" variant="outline" onClick={onCancelEdit}>
              Batal
            </Button>
          ) : null}
        </div>
      </fieldset>
    </form>
  )
}
