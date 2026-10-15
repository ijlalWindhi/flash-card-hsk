import { createFileRoute } from "@tanstack/react-router"
import { StudyPage } from "@/components/study-page"
import { SYLLABUSES } from "@/features/vocabulary/syllabus"
import { seo } from "@/lib/seo"

const SYLLABUS = SYLLABUSES["2.0-5"]

export const Route = createFileRoute("/hsk2/5/study")({
  component: () => <StudyPage syllabus={SYLLABUS} />,
  head: () =>
    seo({
      title: "Flashcard HSK 5 Versi 2.0 — Hafalkan Hanzi Satu per Satu",
      description:
        "Latihan flashcard 1.300 kosa kata HSK 2.0 tingkat 5. Kartu menampilkan hanzi lebih dulu — balik untuk melihat pinyin dan artinya. Atur jumlah kartu tiap sesi.",
      path: "/hsk2/5/study",
    }),
})
