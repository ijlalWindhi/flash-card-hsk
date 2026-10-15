import { createFileRoute } from "@tanstack/react-router"
import {
  VocabularyPage,
  VocabularyUnavailable,
} from "@/components/vocabulary-page"
import { SYLLABUSES } from "@/features/vocabulary/syllabus"
import { getVocabularyFn } from "@/features/vocabulary/vocabulary.functions"
import { seo } from "@/lib/seo"

const SYLLABUS = SYLLABUSES["2.0-5"]

export const Route = createFileRoute("/hsk2/5/")({
  component: Hsk2Level5VocabularyPage,
  loader: () => getVocabularyFn({ data: { syllabus: SYLLABUS.id } }),
  errorComponent: VocabularyUnavailable,
  head: () =>
    seo({
      title: "Kosa Kata HSK 5 Versi 2.0 — 1.300 Kata Arti Indonesia",
      description:
        "Daftar lengkap 1.300 kosa kata HSK 2.0 tingkat 5, silabus yang masih dipakai mayoritas pusat ujian, dengan arti bahasa Indonesia dan Inggris. Gratis.",
      path: "/hsk2/5",
    }),
})

function Hsk2Level5VocabularyPage() {
  return <VocabularyPage syllabus={SYLLABUS} items={Route.useLoaderData()} />
}
