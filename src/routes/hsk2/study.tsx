import { createFileRoute } from "@tanstack/react-router"
import { StudyPage } from "@/components/study-page"
import { SYLLABUSES } from "@/features/vocabulary/syllabus"
import { seo } from "@/lib/seo"

const SYLLABUS = SYLLABUSES["2.0"]

export const Route = createFileRoute("/hsk2/study")({
  component: () => <StudyPage syllabus={SYLLABUS} />,
  head: () =>
    seo({
      title: "Flashcard HSK 4 Versi 2.0 — Hafalkan Hanzi Satu per Satu",
      description:
        "Latihan flashcard 600 kosa kata HSK 2.0 tingkat 4. Kartu menampilkan hanzi lebih dulu — balik untuk melihat pinyin dan artinya. Atur jumlah kartu tiap sesi.",
      path: "/hsk2/study",
    }),
})
