import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { AdminVocabularyForm } from "@/components/admin-vocabulary-form"
import { AdminVocabularyTable } from "@/components/admin-vocabulary-table"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/empty-state"
import { getAdminSessionFn, logoutFn } from "@/features/admin/auth.functions"
import {
  checkManualVocabularyHanziFn,
  createManualVocabularyFn,
  deleteManualVocabularyFn,
  listManualVocabularyFn,
  updateManualVocabularyFn,
} from "@/features/admin/vocabulary.functions"
import { seo } from "@/lib/seo"
import type { FieldError } from "@/features/admin/vocabulary.schemas"
import type { VocabularyItem } from "@/features/vocabulary/types"

export const Route = createFileRoute("/admin/")({
  component: AdminPage,
  errorComponent: AdminUnavailable,
  head: () =>
    seo({
      title: "Kelola Kata",
      description: "Halaman pengelolaan kosa kata.",
      path: "/admin",
      noindex: true,
    }),
  loader: async () => {
    const session = await getAdminSessionFn()
    if (!session.authenticated) throw redirect({ to: "/admin/login" })
    return listManualVocabularyFn()
  },
})

function AdminPage() {
  const items = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()
  const [editing, setEditing] = useState<VocabularyItem | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  /** Mutations refetch the loader so the table is never guessing. */
  async function refresh() {
    await router.invalidate()
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-mark">Admin</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight">Kelola kata</h1>
          <p className="mt-2 max-w-prose text-sm text-muted-foreground">
            Tambahkan kata di luar silabus. Entri resmi tetap membawa sumbernya dan tidak
            bisa diubah di sini.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            await logoutFn()
            await navigate({ to: "/admin/login" })
          }}
        >
          Keluar
        </Button>
      </div>

      <section className="mt-8 border border-border bg-card p-5">
        <h2 className="text-sm font-medium">
          {editing ? `Ubah ${editing.hanzi}` : "Tambah kata baru"}
        </h2>
        <div className="mt-4">
          <AdminVocabularyForm
            editing={editing}
            onCancelEdit={() => setEditing(null)}
            onCheckHanzi={async (hanzi, excludeId) => {
              const result = await checkManualVocabularyHanziFn({
                data: { hanzi, excludeId },
              })
              return result.message
            }}
            onSubmit={async (input): Promise<Array<FieldError> | null> => {
              const result = editing
                ? await updateManualVocabularyFn({
                    data: { ...input, id: editing.id },
                  })
                : await createManualVocabularyFn({ data: input })

              if (!result.ok) return result.errors

              setEditing(null)
              setNotice(editing ? "Perubahan disimpan." : "Kata ditambahkan.")
              await refresh()
              return null
            }}
          />
        </div>
      </section>

      {notice ? (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          {notice}
        </p>
      ) : null}

      <section className="mt-10">
        <AdminVocabularyTable
          items={items}
          onEdit={(item) => {
            setNotice(null)
            setEditing(item)
          }}
          onDelete={async (item) => {
            const result = await deleteManualVocabularyFn({ data: { id: item.id } })
            setNotice(
              result.ok ? `${item.hanzi} dihapus.` : result.errors[0]?.message ?? null,
            )
            if (result.ok && editing?.id === item.id) setEditing(null)
            await refresh()
          }}
        />
      </section>
    </main>
  )
}

function AdminUnavailable() {
  const router = useRouter()

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-20">
      <EmptyState
        eyebrow="Gagal memuat"
        title="Daftar kata manual tidak bisa dimuat"
        description="Aplikasi tidak dapat menghubungi basis data. Kata yang sudah tersimpan tidak terpengaruh."
        action={<Button onClick={() => void router.invalidate()}>Coba lagi</Button>}
      />
    </main>
  )
}
