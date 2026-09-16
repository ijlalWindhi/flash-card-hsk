import { createFileRoute } from "@tanstack/react-router"
import {
  VocabularyPage,
  VocabularyUnavailable,
} from "@/components/vocabulary-page"
import { SYLLABUSES } from "@/features/vocabulary/syllabus"
import { getVocabularyFn } from "@/features/vocabulary/vocabulary.functions"
import { seo } from "@/lib/seo"

const SYLLABUS = SYLLABUSES["2.0"]

export const Route = createFileRoute("/hsk2/")({
  component: Hsk2VocabularyPage,
  loader: () => getVocabularyFn({ data: { syllabus: SYLLABUS.id } }),
  errorComponent: VocabularyUnavailable,
  head: () =>
    seo({
      title: "Kosa Kata HSK 4 Versi 2.0 — 600 Kata Arti Indonesia",
      description:
        "Daftar lengkap 600 kosa kata HSK 2.0 tingkat 4, silabus yang masih dipakai mayoritas pusat ujian, dengan arti bahasa Indonesia dan Inggris. Gratis.",
      path: "/hsk2",
    }),
})

function Hsk2VocabularyPage() {
  return <VocabularyPage syllabus={SYLLABUS} items={Route.useLoaderData()} />
}
