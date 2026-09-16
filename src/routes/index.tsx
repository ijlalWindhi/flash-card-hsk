import { createFileRoute } from "@tanstack/react-router"
import {
  VocabularyPage,
  VocabularyUnavailable,
} from "@/components/vocabulary-page"
import { SYLLABUSES } from "@/features/vocabulary/syllabus"
import { getVocabularyFn } from "@/features/vocabulary/vocabulary.functions"
import { seo, webApplicationJsonLd } from "@/lib/seo"

const SYLLABUS = SYLLABUSES["3.0"]

const DESCRIPTION =
  "Daftar lengkap 1.000 kosa kata HSK 3.0 tingkat 4 dengan arti bahasa Indonesia dan Inggris. Cari, pilih kata, lalu latih lewat flashcard atau quiz. Gratis."

export const Route = createFileRoute("/")({
  component: Hsk3VocabularyPage,
  loader: () => getVocabularyFn({ data: { syllabus: SYLLABUS.id } }),
  errorComponent: VocabularyUnavailable,
  head: () => {
    const { meta, links } = seo({
      title: "Kosa Kata HSK 4 — 1.000 Kata Arti Indonesia",
      description: DESCRIPTION,
      path: "/",
    })
    // Structured data on this page only: it describes the application as a
    // whole, and repeating it on the HSK 2.0 list would claim the two word
    // lists are two separate apps.
    return { meta: [...meta, webApplicationJsonLd(DESCRIPTION)], links }
  },
})

function Hsk3VocabularyPage() {
  return <VocabularyPage syllabus={SYLLABUS} items={Route.useLoaderData()} />
}
