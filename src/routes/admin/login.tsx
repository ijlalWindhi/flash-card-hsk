import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { AdminLoginForm } from "@/components/admin-login-form"
import { loginFn } from "@/features/admin/auth.functions"
import { seo } from "@/lib/seo"

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginPage,
  head: () =>
    seo({
      title: "Masuk Admin",
      description: "Halaman masuk pengelola kosa kata.",
      path: "/admin/login",
      noindex: true,
    }),
})

function AdminLoginPage() {
  const navigate = useNavigate()

  return (
    <main className="mx-auto w-full max-w-sm px-5 py-20">
      <p className="eyebrow text-mark">Admin</p>
      <h1 className="mt-2 text-2xl font-medium tracking-tight">Masuk</h1>
      <p className="mt-2 mb-8 text-sm text-muted-foreground">
        Halaman ini hanya untuk mengelola kata tambahan. Kata resmi dari silabus
        tidak bisa diubah dari sini.
      </p>

      <AdminLoginForm
        onSubmit={async (password) => {
          const result = await loginFn({ data: { password } })
          if (!result.ok) return result.message
          await navigate({ to: "/admin" })
          return null
        }}
      />
    </main>
  )
}
