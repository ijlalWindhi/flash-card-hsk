import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useHydrated } from "@/lib/use-hydrated"

/**
 * The single gate into the editor.
 *
 * There is one administrator and no account list, so this asks for a password
 * and nothing else — no email, no "remember me", no sign-up path.
 */
export function AdminLoginForm({
  onSubmit,
}: {
  onSubmit: (password: string) => Promise<string | null>
}) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const hydrated = useHydrated()
  const inputId = useId()
  const errorId = `${inputId}-error`

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(await onSubmit(password))
    setPending(false)
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/*
        Inert until hydrated: this is a controlled input, so anything typed
        before React attaches would be invisible to it and submitted as empty.
      */}
      <fieldset
        disabled={!hydrated || pending}
        className="grid gap-4 border-0 p-0 disabled:opacity-70"
      >
        <div className="grid gap-2">
          <Label htmlFor={inputId}>Kata sandi admin</Label>
          <Input
            id={inputId}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
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
        <div>
          <Button type="submit">{pending ? "Memeriksa…" : "Masuk"}</Button>
        </div>
      </fieldset>
    </form>
  )
}
