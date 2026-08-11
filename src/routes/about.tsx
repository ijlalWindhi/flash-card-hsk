import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/about")({ component: AboutPage })

function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12">
      <h1 className="text-2xl font-medium tracking-tight">
        Sumber dan atribusi
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Halaman ini menjelaskan asal data kosa kata dan lisensinya.
      </p>
    </main>
  )
}
