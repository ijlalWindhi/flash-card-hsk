import { createFileRoute } from "@tanstack/react-router"
import { QuizPage } from "@/components/quiz-page"
import { SYLLABUSES } from "@/features/vocabulary/syllabus"
import { seo } from "@/lib/seo"

const SYLLABUS = SYLLABUSES["3.0"]

export const Route = createFileRoute("/quiz")({
  component: () => <QuizPage syllabus={SYLLABUS} />,
  head: () =>
    seo({
      title: "Quiz HSK 4 — Lima Mode Latihan Kosa Kata",
      description:
        "Uji hafalan kosa kata HSK 3.0 tingkat 4 lewat lima mode: pilihan ganda, benar atau salah, mengetik, menjodohkan, dan menulis hanzi. Hasil tersimpan beserta hari beruntunmu.",
      path: "/quiz",
    }),
})
