import {
  Link,
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router"
import { AccountForm } from "@/components/account-form"
import { registerFn } from "@/features/accounts/auth.functions"
import { seo } from "@/lib/seo"

export const Route = createFileRoute("/daftar")({
  component: RegisterPage,
  head: () =>
    seo({
      title: "Daftar Akun",
      description:
        "Buat akun Han.note gratis untuk menyimpan progres belajar kosa kata HSK 4, melacak kata yang sering salah, dan menjaga hari beruntunmu.",
      path: "/daftar",
    }),
})

function RegisterPage() {
  const navigate = useNavigate()
  const router = useRouter()

  return (
    <main className="mx-auto w-full max-w-sm px-5 py-20">
      <p className="eyebrow text-mark">Akun</p>
      <h1 className="mt-2 text-2xl font-medium tracking-tight">Daftar</h1>
      {/*
        Said plainly and once: there is no email, so there is no way to send a
        reset link. Better here than discovered on the day it matters.
      */}
      <p className="mt-2 mb-8 text-sm text-muted-foreground">
        Cukup nama pengguna dan kata sandi — tanpa email. Karena itu kata sandi
        yang hilang tidak bisa dipulihkan, jadi simpan baik-baik.
      </p>

      <AccountForm
        submitLabel="Daftar"
        autoComplete="new-password"
        passwordHint="Minimal 8 karakter."
        onSubmit={async (username, password) => {
          const result = await registerFn({ data: { username, password } })
          if (!result.ok)
            return { field: result.field, message: result.message }
          await router.invalidate()
          await navigate({ to: "/" })
          return null
        }}
      />

      <p className="mt-6 text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link to="/masuk" className="underline underline-offset-4">
          Masuk
        </Link>
      </p>
    </main>
  )
}
