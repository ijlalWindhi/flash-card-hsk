import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useHydrated } from "@/lib/use-hydrated"
import type { AuthField } from "@/features/accounts/auth.schemas"

export type AccountFormError = { field: AuthField; message: string }

/**
 * The username and password form, shared by sign in and registration.
 *
 * Both screens ask for exactly the same two things and report errors the same
 * way; only the labels and the submit handler differ. The parent owns the
 * request, so this component never imports a server function.
 */
export function AccountForm({
  submitLabel,
  passwordHint,
  autoComplete,
  onSubmit,
}: {
  submitLabel: string
  passwordHint?: string
  /** `current-password` when signing in, `new-password` when registering. */
  autoComplete: "current-password" | "new-password"
  onSubmit: (
    username: string,
    password: string
  ) => Promise<AccountFormError | null>
}) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<AccountFormError | null>(null)
  const [pending, setPending] = useState(false)
  const hydrated = useHydrated()

  const usernameId = useId()
  const passwordId = useId()
  const errorId = `${usernameId}-error`

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      setError(await onSubmit(username, password))
    } catch {
      setError({ field: "form", message: "Gagal menghubungi server." })
    } finally {
      setPending(false)
    }
  }

  const fieldError = (field: AuthField) =>
    error?.field === field ? error.message : null

  return (
    /*
      `noValidate`: the rules live in auth.schemas, and the browser's own
      constraint bubble would pre-empt the messages those produce.
    */
    <form onSubmit={handleSubmit} noValidate>
      {/*
        Inert until hydrated: these are controlled inputs, so anything typed
        before React attaches is invisible to it and would submit as empty —
        and the click would trigger a native GET that discards it entirely.
      */}
      <fieldset
        disabled={!hydrated || pending}
        className="grid gap-5 border-0 p-0 disabled:opacity-70"
      >
        <div className="grid gap-2">
          <Label htmlFor={usernameId}>Nama pengguna</Label>
          <Input
            id={usernameId}
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={username}
            onChange={(event) => {
              setUsername(event.target.value)
              setError(null)
            }}
            aria-invalid={fieldError("username") !== null}
            aria-describedby={fieldError("username") ? errorId : undefined}
          />
          {fieldError("username") ? (
            <p id={errorId} role="alert" className="text-sm text-destructive">
              {fieldError("username")}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor={passwordId}>Kata sandi</Label>
          <Input
            id={passwordId}
            name="password"
            type="password"
            autoComplete={autoComplete}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setError(null)
            }}
            aria-invalid={fieldError("password") !== null}
          />
          {fieldError("password") ? (
            <p role="alert" className="text-sm text-destructive">
              {fieldError("password")}
            </p>
          ) : passwordHint ? (
            <p className="text-xs text-muted-foreground">{passwordHint}</p>
          ) : null}
        </div>

        {fieldError("form") ? (
          <p role="alert" className="text-sm text-destructive">
            {fieldError("form")}
          </p>
        ) : null}

        <Button type="submit">{pending ? "Memproses…" : submitLabel}</Button>
      </fieldset>
    </form>
  )
}
