import {
  Link,
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router"
import { AccountForm } from "@/components/account-form"
import { loginFn } from "@/features/accounts/auth.functions"

export const Route = createFileRoute("/masuk")({ component: SignInPage })

function SignInPage() {
  const navigate = useNavigate()
  const router = useRouter()

  return (
    <main className="mx-auto w-full max-w-sm px-5 py-20">
      <p className="eyebrow text-mark">Akun</p>
      <h1 className="mt-2 text-2xl font-medium tracking-tight">Masuk</h1>
      <p className="mt-2 mb-8 text-sm text-muted-foreground">
        Masuk untuk menyimpan hasil quiz, melacak kata yang sering salah, dan
        menjaga hari beruntunmu.
      </p>

      <AccountForm
        submitLabel="Masuk"
        autoComplete="current-password"
        onSubmit={async (username, password) => {
          const result = await loginFn({ data: { username, password } })
          if (!result.ok)
            return { field: result.field, message: result.message }
          // The root loader holds the session; invalidate before navigating so
          // the header shows the new name on the very first render.
          await router.invalidate()
          await navigate({ to: "/" })
          return null
        }}
      />

      <p className="mt-6 text-sm text-muted-foreground">
        Belum punya akun?{" "}
        <Link to="/daftar" className="underline underline-offset-4">
          Daftar
        </Link>
      </p>
    </main>
  )
}
