import { createFileRoute } from "@tanstack/react-router"
import { seo } from "@/lib/seo"

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () =>
    seo({
      title: "Sumber Data dan Atribusi",
      description:
        "Dari mana kedua daftar kata HSK 4 di Han.note berasal — silabus 3.0 dan 2.0 — lisensi tiap sumbernya, dan bagaimana arti bahasa Indonesia serta Inggris disusun.",
      path: "/about",
    }),
})

const SYLLABUS_30_URL =
  "https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf"

const SYLLABUS_20_URL =
  "https://raw.githubusercontent.com/glxxyz/hskhsk.com/master/data/lists/HSK%20Official%20With%20Definitions%202012%20L4.txt"

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-border pt-6">
      <h2 className="eyebrow text-mark">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  )
}

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-foreground underline underline-offset-4"
    >
      {children}
    </a>
  )
}

function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pt-10 pb-16">
      <p className="eyebrow text-mark">Tentang data</p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight">
        Sumber dan atribusi
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Setiap kata di aplikasi ini bisa ditelusuri asalnya. Halaman ini
        menjelaskan dari mana daftar kata, pinyin, dan kedua artinya berasal,
        serta lisensi yang mengikat penggunaannya.
      </p>

      {/*
        The exact designations the design spec requires, kept verbatim in
        English: they are formal labels for which syllabus a deck follows, not
        prose.
      */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <p className="border-2 border-foreground bg-card px-5 py-4 text-base font-medium">
          HSK 3.0 (latest published syllabus)
        </p>
        <p className="border-2 border-foreground bg-card px-5 py-4 text-base font-medium">
          HSK 2.0 (2012 syllabus)
        </p>
      </div>

      <div className="mt-10 grid gap-8">
        <Section title="Dua silabus, dua daftar kata">
          <p>
            Aplikasi ini memuat <strong className="text-foreground">dua</strong>{" "}
            daftar kata tingkat 4 yang bisa dipilih lewat tombol 3.0 / 2.0 di
            bagian atas. Keduanya daftar yang berbeda, bukan dua edisi dari
            daftar yang sama: hanya 132 kata yang muncul di kedua-duanya.
          </p>
          <p>
            <strong className="text-foreground">HSK 3.0</strong> adalah silabus{" "}
            <em>terbitan terbaru</em>, bukan pernyataan bahwa semua pusat ujian
            sudah memakainya. CLEC menyebut ujian HSK 3.0 masih dalam tahap uji
            coba global (<em>pilot</em>) dan tanggal mulai resminya diumumkan
            terpisah.
          </p>
          <p>
            <strong className="text-foreground">HSK 2.0</strong> adalah silabus
            2012 yang sampai sekarang masih dipakai mayoritas pusat ujian. Kalau
            kamu sedang menyiapkan ujian, pastikan dulu format yang dipakai
            pusat ujianmu, lalu pilih daftar yang sesuai.
          </p>
        </Section>

        <Section title="Daftar kata HSK 3.0 — 1.000 kata">
          <p>
            Keanggotaan tingkat 4 ditentukan oleh{" "}
            <Ext href={SYLLABUS_30_URL}>新版HSK考试大纲</Ext> terbitan CLEC
            versi 2025-11. Daftar ini memuat tepat 1.000 kata yang{" "}
            <em>diperkenalkan</em> di tingkat 4 — kata HSK 1–3 tidak ikut.
          </p>
          <p>
            Karena silabusnya berbentuk PDF, transkripsi yang bisa dibaca mesin
            diambil dari{" "}
            <Ext href="https://github.com/ivankra/hsk30">ivankra/hsk30</Ext>{" "}
            (MIT), lalu diperiksa ulang terhadap jumlah kata per tingkat yang
            diumumkan silabus.
          </p>
        </Section>

        <Section title="Daftar kata HSK 2.0 — 600 kata">
          <p>
            Keanggotaannya ditentukan oleh 新汉语水平考试大纲 HSK四级 terbitan
            Hanban edisi 2012: 600 kata yang <em>diperkenalkan</em> di tingkat
            4, di atas 600 kata HSK 1–3 — itulah sebabnya ujian ini sering
            disebut butuh 1.200 kata.
          </p>
          <p>
            CLEC sudah tidak lagi menerbitkan PDF silabus 2.0, sehingga rujukan
            yang masih bisa diakses adalah transkripsinya di{" "}
            <Ext href={SYLLABUS_20_URL}>hskhsk.com</Ext> (MIT) — daftar yang
            jumlah per tingkatnya cocok dengan angka resmi 2012.
          </p>
        </Section>

        <Section title="Arti Inggris">
          <p>
            Dari{" "}
            <Ext href="https://cc-cedict.org/editor/editor.php?handler=Download">
              CC-CEDICT
            </Ext>
            , kamus Mandarin–Inggris bebas yang dikelola komunitas dan
            diterbitkan MDBG.
          </p>
        </Section>

        <Section title="Arti Indonesia">
          <p>
            Dari <Ext href="https://cidict.org/download/">CC-CIDICT</Ext> versi
            1.26, kamus Mandarin–Indonesia turunan CC-CEDICT yang diterjemahkan
            tim Harmony Mandarin bersama editor sukarela. Arti Indonesia di sini{" "}
            <strong className="text-foreground">bukan</strong> hasil terjemahan
            mesin.
          </p>
          <p>
            Tiga kata tidak punya entri di kedua kamus (眼里 dan 有劲儿 di
            daftar 3.0, 弹钢琴 di daftar 2.0); artinya ditulis manual dan
            ditandai di repositori.
          </p>
        </Section>

        <Section title="Lisensi">
          <p>
            CC-CEDICT dan CC-CIDICT berlisensi{" "}
            <Ext href="https://creativecommons.org/licenses/by-sa/4.0/">
              CC BY-SA 4.0
            </Ext>
            . Kedua berkas data aplikasi ini adalah karya turunan keduanya,
            sehingga ikut dibagikan di bawah CC BY-SA 4.0 — siapa pun yang
            menyebarkannya ulang wajib mempertahankan atribusi ini dan lisensi
            yang sama.
          </p>
          <p>
            Teks atribusi lengkap ada di berkas{" "}
            <code className="text-foreground">ATTRIBUTION.md</code> di
            repositori, dan rincian per kolom ada di{" "}
            <code className="text-foreground">docs/dataset-provenance.md</code>.
          </p>
        </Section>

        <Section title="Kata tambahan">
          <p>
            Administrator bisa menambahkan kata di luar silabus. Kata seperti
            itu ditandai sebagai entri manual dan tidak membawa metadata sumber
            apa pun — hanya entri resmi yang mencantumkan silabus, versi, dan
            tanggal verifikasinya. Karena tidak terikat silabus manapun, kata
            tambahan muncul di daftar 3.0 maupun 2.0.
          </p>
        </Section>
      </div>
    </main>
  )
}
