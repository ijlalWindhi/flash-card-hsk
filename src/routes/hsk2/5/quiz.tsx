import { createFileRoute } from "@tanstack/react-router"
import { QuizPage } from "@/components/quiz-page"
import { SYLLABUSES } from "@/features/vocabulary/syllabus"
import { seo } from "@/lib/seo"

const SYLLABUS = SYLLABUSES["2.0-5"]

export const Route = createFileRoute("/hsk2/5/quiz")({
  component: () => <QuizPage syllabus={SYLLABUS} />,
  head: () =>
    seo({
      title: "Quiz HSK 5 Versi 2.0 — Lima Mode Latihan Kosa Kata",
      description:
        "Uji hafalan 1.300 kosa kata HSK 2.0 tingkat 5 lewat lima mode: pilihan ganda, benar atau salah, mengetik, menjodohkan, dan menulis hanzi. Hasil tersimpan beserta hari beruntunmu.",
      path: "/hsk2/5/quiz",
    }),
})
