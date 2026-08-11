# Firestore penuh, Firebase Auth berbasis role, dan SEO

Tanggal: 2026-08-12

Memindahkan sisa data yang masih di Turso ke Firestore, mengganti dua sistem
autentikasi buatan sendiri dengan Firebase Auth berbasis role, dan menutup
lubang SEO serta identitas visual yang masih memakai bawaan template.

## Keadaan sebelum perubahan

Aplikasi berjalan di atas dua basis data sekaligus:

| Tempat | Isi | Jumlah nyata |
| --- | --- | --- |
| Turso / libSQL (Drizzle) | tabel `vocabulary` | 1.000 baris `official`, 0 `manual` |
| Firestore | `users` | 1 dokumen |
| Firestore | `quizResults`, `wordStats`, `userBadges`, `userProgress` | 0 dokumen |

Autentikasinya juga ada dua, dan keduanya buatan sendiri:

- **Learner** — username + kata sandi, hash scrypt di `features/accounts/password.ts`,
  sesi lewat JWT yang ditandatangani `USER_SESSION_SECRET`. Tanpa email, sehingga
  kata sandi yang hilang tidak bisa dipulihkan.
- **Admin** — satu `ADMIN_PASSWORD` bersama di env, dibandingkan konstan-waktu,
  sesi lewat JWT kedua dengan `ADMIN_SESSION_SECRET`. Tidak ada akun, tidak ada
  identitas, tidak ada jejak siapa yang mengubah apa.

Karena hanya ada satu dokumen user dan nol hasil quiz, tidak ada data produksi
yang perlu diselamatkan. Itu yang membuat desain ini bisa membuang sistem lama
sepenuhnya alih-alih menjembataninya.

## Sasaran

1. Firestore menjadi satu-satunya basis data. Turso dan Drizzle hilang dari repo.
2. Firebase Auth (email/password) menjadi satu-satunya sumber identitas, dengan
   role `admin` dan `user`.
3. Satu akun admin terdaftar dan bisa mengelola kosa kata.
4. Form daftar meminta nama, email, kata sandi, dan konfirmasi kata sandi, dengan
   tombol mata di setiap field kata sandi.
5. Favicon dan ikon aplikasi yang dibuat khusus, bukan bawaan template.
6. SEO teknis yang lengkap: meta per halaman, canonical, Open Graph, JSON-LD,
   sitemap, robots.

## Bukan sasaran

- Reset kata sandi lewat email. Firebase menyediakannya, tapi butuh konfigurasi
  template email dan domain pengirim — pekerjaan terpisah.
- Verifikasi email sebelum akun aktif.
- Provider selain email/password.
- Halaman admin untuk mengelola *user*. Admin hanya mengelola kosa kata.
- Menjamin peringkat teratas di mesin pencari. Lihat catatan di bagian SEO.

## Model data Firestore

### `vocabulary/{id}`

Satu dokumen per kata.

```
externalId      string | null    "hsk3-4-0001" untuk resmi, null untuk manual
hanzi           string
pinyin          string
pinyinSortKey   string           normalizePinyin(pinyin) — kunci urut dan cari
translationId   string
translationEn   string
kind            "official" | "manual"
manualKey       string | null    `${hanzi}|${pinyin}` — hanya untuk manual
sourceName      string | null
sourceUrl       string | null
sourceVersion   string | null
verifiedAt      string | null
createdAt       Timestamp
updatedAt       Timestamp
```

ID dokumen mengikuti skema yang sudah dipakai sekarang: `official:<externalId>`
untuk kata resmi, UUID untuk entri manual. ID yang deterministik untuk kata resmi
inilah yang membuat re-seed menjadi no-op, bukan duplikasi.

**Keunikan entri manual.** SQLite menegakkannya lewat unique index parsial pada
`(hanzi, pinyin)` yang dibatasi `kind = 'manual'`. Firestore tidak punya unique
index sama sekali. Penggantinya adalah field `manualKey` yang dicek di dalam
transaksi:

```
runTransaction(async (tx) => {
  const bentrok = await tx.get(
    vocabulary.where("manualKey", "==", key).limit(1)
  )
  if (!bentrok.empty) throw new DuplicateWordError()
  tx.set(ref, dokumen)
})
```

`tx.get(query)` mengunci rentang kueri, jadi dua permintaan bersamaan tidak bisa
sama-sama melihat hasil kosong lalu sama-sama menulis. Pola ini juga menangani
kasus yang tidak ditangani unique index dengan mulus: admin mengubah hanzi atau
pinyin sebuah entri yang sudah ada, yang berarti `manualKey`-nya berpindah.

Field ini tidak butuh composite index — kueri pada satu field memakai index
otomatis Firestore.

Batasan yang sengaja dipertahankan: kata `official` tetap tidak bisa diubah atau
dihapus lewat layar admin, persis seperti sekarang. Silabus membawa provenance-nya
sendiri dan itu tidak boleh ditimpa.

### `users/{uid}`

```
name       string
email      string
role       "admin" | "user"
createdAt  Timestamp
```

`uid` adalah UID Firebase Auth. Dokumen ini adalah **cermin**, bukan sumber
kebenaran: otorisasi dibaca dari custom claim, bukan dari sini. Gunanya untuk
kebutuhan yang butuh membaca daftar user tanpa memanggil Admin SDK, dan sebagai
tempat menaruh preferensi belajar nanti.

### `quizResults`, `wordStats`, `userBadges`, `userProgress`

Bentuknya tidak berubah. Yang berubah hanya isi field `userId`: dulu username
yang dilipat huruf kecilnya, sekarang UID Firebase. Karena keempatnya kosong,
tidak ada migrasi — hanya penulis barunya yang mengisi nilai berbeda.

## Biaya baca dan cache

Ini bagian yang menentukan kelayakan, bukan optimasi opsional.

Halaman utama memuat **seluruh** daftar kata lewat SSR loader, lalu memfilternya
di klien. Dengan Drizzle itu satu kueri SQL. Dengan Firestore itu **1.000
document read setiap kali halaman dibuka**. Kuota gratis 50.000 read/hari habis
di sekitar 50 kunjungan — sebelum menghitung `/study` dan `/quiz` yang memuat
daftar yang sama.

Penyelesaiannya adalah cache di sisi server, `src/features/vocabulary/vocabulary.cache.ts`:

- variabel tingkat modul berisi `{ items, loadedAt }`
- TTL 10 menit
- di-invalidate secara eksplisit setelah setiap mutasi admin berhasil

Invalidasi eksplisit hanya berlaku pada instance yang melayani mutasi itu.
Instance serverless lain menyusul saat TTL-nya habis, jadi jendela ketidakcocokan
paling lama 10 menit untuk kata yang baru ditambahkan. Itu wajar untuk daftar
kosa kata; yang tidak wajar adalah tagihannya tanpa cache.

Hasilnya: ~1.000 read per 10 menit per instance, bukan per pengunjung.

Kalau nanti jendela 10 menit terasa terlalu panjang, jalur peningkatannya adalah
dokumen `vocabularyMeta/revision` berisi penghitung — satu read per page load
untuk memeriksa kesegaran, jauh lebih murah daripada 1.000. Belum dikerjakan
sekarang karena belum ada yang membutuhkannya.

## Autentikasi

### Alur

Seluruhnya di server. Tidak ada Firebase Client SDK di browser, sehingga tidak
ada tambahan JavaScript dan tidak ada dua sumber state yang bisa tidak sinkron.

**Daftar** (`registerFn`):

1. `auth.createUser({ email, password, displayName: name })`
2. `auth.setCustomUserClaims(uid, { role: "user" })`
3. tulis `users/{uid}`
4. REST `accounts:signInWithPassword` → `idToken`
5. `auth.createSessionCookie(idToken, { expiresIn: 14 hari })` → cookie httpOnly

**Masuk** (`loginFn`): langkah 4 dan 5 saja.

**Keluar** (`logoutFn`): kosongkan cookie.

Langkah 4 ada karena `createSessionCookie` hanya menerima ID token, dan ID token
hanya bisa diterbitkan lewat jalur REST. Ini yang membuat `FIREBASE_API_KEY`
dibutuhkan. Kunci itu memang dirancang untuk publik — pengamanannya ada di
Firebase Security Rules dan Auth, bukan pada kerahasiaan kunci — tapi tetap
disimpan sebagai env server karena tidak ada yang membutuhkannya di browser.

### Verifikasi sesi

`auth.verifySessionCookie(cookie, false)` — `checkRevoked: false`.

Opsi `true` menambah satu panggilan jaringan ke Identity Toolkit **di setiap
render SSR**, termasuk root loader yang jalan di semua halaman. Dengan `false`,
verifikasi murni memeriksa tanda tangan JWT memakai kunci publik yang di-cache
SDK, tanpa jaringan sama sekali.

Konsekuensi yang harus disadari dan diterima:

- Cookie yang dicuri tetap sah sampai kedaluwarsa, tidak bisa dicabut dari server.
- **Perubahan role baru berlaku setelah user login ulang**, karena claim dibekukan
  di dalam cookie saat diterbitkan. Untuk aplikasi dengan satu admin yang
  dibuat lewat script, ini tidak pernah jadi masalah dalam praktik.

Ini pertukaran yang dipilih sadar: latensi setiap halaman melawan pencabutan sesi
yang, di aplikasi ini, tidak ada yang membutuhkannya.

### Bentuk sesi

```ts
type SessionUser = {
  uid: string
  name: string
  email: string
  role: "admin" | "user"
}
```

Ketiga field selain `uid` ikut terbawa di dalam session cookie — `name` dari
`displayName`, `email` dari akun, `role` dari custom claim. Artinya
`currentUser()` **tidak melakukan satu pun read ke Firestore**. Header yang
menampilkan nama di setiap halaman jadi gratis.

### Otorisasi

`requireAdmin()` memeriksa `role === "admin"` dari sesi. Setiap server function
admin memanggilnya lebih dulu, dan ia melempar alih-alih mengembalikan flag
supaya sebuah handler tidak bisa lupa memeriksa hasilnya — pola yang sudah
dipakai sekarang dan dipertahankan.

`/admin` memeriksa role di loader-nya dan `redirect({ to: "/masuk" })` kalau
bukan admin. Link "Kelola kata" hanya muncul di header untuk admin, tapi itu
kenyamanan, bukan pengamanan: penegakannya ada di server function.

### Pemetaan pesan galat

Galat REST diterjemahkan ke bahasa Indonesia sebelum sampai ke form:

| Kode REST | Pesan | Field |
| --- | --- | --- |
| `EMAIL_EXISTS` | Email sudah terdaftar. Coba masuk. | `email` |
| `EMAIL_NOT_FOUND`, `INVALID_PASSWORD`, `INVALID_LOGIN_CREDENTIALS` | Email atau kata sandi salah. | `form` |
| `TOO_MANY_ATTEMPTS_TRY_LATER` | Terlalu banyak percobaan. Coba lagi beberapa menit lagi. | `form` |
| `USER_DISABLED` | Akun ini dinonaktifkan. | `form` |
| selain itu | Layanan akun sedang tidak tersedia. | `form` |

Satu pesan generik untuk "email tidak ada" dan "kata sandi salah" adalah
disengaja: membedakan keduanya memberi penyerang cara memastikan siapa saja yang
sudah terdaftar. Alasan sebenarnya tetap dicatat lewat `console.error` karena itu
kesalahan penempatan yang harus dilihat seseorang, dan tidak boleh sampai ke
browser.

## Form

`AccountForm` yang sekarang dipakai bersama oleh dua halaman dipecah, karena
isinya tidak lagi sama:

- `components/register-form.tsx` — Nama, Email, Kata sandi, Konfirmasi kata sandi
- `components/login-form.tsx` — Email, Kata sandi

Keduanya mempertahankan pola yang sudah ada: `noValidate` supaya bubble bawaan
browser tidak mendahului pesan dari skema, dan `fieldset` yang nonaktif sampai
hidrasi selesai supaya ketikan sebelum React menempel tidak hilang diam-diam.

### `components/ui/password-input.tsx`

Input kata sandi dengan tombol mata di dalam field:

- ikon `Eye` / `EyeOff` dari lucide-react
- `type="button"` — tanpa ini tombolnya ikut men-submit form
- `aria-label` ikut berubah: "Tampilkan kata sandi" / "Sembunyikan kata sandi"
- `aria-pressed` mengikuti state, sehingga pembaca layar tahu ini toggle
- state tersembunyi/terlihat milik masing-masing field, tidak dibagi

Dipakai di ketiga field kata sandi.

### Skema validasi

```
nameSchema      trim, 2–50 karakter
emailSchema     z.email(), trim, lowercase
passwordSchema  min 8, max 200        (tidak berubah)
registerSchema  { name, email, password, confirmPassword }
                .refine(password === confirmPassword) → field "confirmPassword"
loginSchema     { email, password }
```

`usernameSchema` dihapus seluruhnya.

`AuthField` melebar dari `"username" | "password" | "form"` menjadi
`"name" | "email" | "password" | "confirmPassword" | "form"`, dan `firstAuthIssue`
menyesuaikan pemetaan path-nya.

Aturan panjang 8 karakter tanpa aturan komposisi dipertahankan apa adanya,
beserta alasan yang sudah tertulis di kodenya.

## Script dan pelaksanaan migrasi

### Urutan yang dijalankan

1. `npm run db:migrate:firestore` — salin `vocabulary` dari Turso ke Firestore.
2. Verifikasi: hitung dokumen di Firestore, harus 1.000.
3. `npm run admin:create` — buat akun admin.
4. Cabut Turso: hapus dependensi, script migrasi, `drizzle.config.ts`, `drizzle/`.

Verifikasi di langkah 2 adalah gerbang. Pencabutan di langkah 4 tidak dilakukan
sebelum jumlahnya cocok.

### `scripts/migrate-turso-to-firestore.ts` (baru, sekali pakai) — `npm run db:migrate:firestore`

Membaca seluruh tabel `vocabulary` dari Turso, memetakannya ke bentuk dokumen
Firestore, menulis dalam batch 500 (batas Firestore per batch). Melaporkan jumlah
yang ditulis per `kind`.

Isinya secara praktis identik dengan hasil seed dari CSV, karena tidak ada entri
manual. Script ini tetap dibuat karena itu jalur yang benar: kalau ada kata
manual yang ditambahkan antara sekarang dan saat peralihan, kata itu ikut
terbawa — sementara seed dari CSV akan melewatkannya tanpa suara.

Dihapus setelah migrasi terverifikasi, bersama dependensi Turso yang menjadi
satu-satunya alasan keberadaannya.

### `scripts/seed-vocabulary.ts` (ditulis ulang)

Menargetkan Firestore, sumbernya tetap `data/hsk4-3.0.csv`. Ini jalur permanen
untuk re-seed.

Validasi dataset sebelum menulis tetap dipertahankan — script menolak menulis
apa pun kalau ada baris tidak valid atau pasangan duplikat, persis seperti
sekarang.

Idempotensi: baca dulu ID dokumen `official` yang sudah ada dalam satu kueri,
lalu tulis hanya yang belum ada. Menulis lewat `batch.create()` tanpa pemeriksaan
awal tidak bisa dipakai, karena satu dokumen yang sudah ada akan menggagalkan
seluruh batch berisi 500.

### `scripts/create-admin.ts` (baru) — `npm run admin:create`

Membaca `ADMIN_EMAIL` dan `ADMIN_PASSWORD` dari env. Membuat user Firebase Auth,
menetapkan custom claim `role: "admin"`, menulis `users/{uid}`.

Idempotent: kalau email sudah ada, perbarui kata sandi dan claim-nya alih-alih
gagal. Ini juga yang menjadikannya cara memulihkan akses kalau kata sandi admin
hilang.

Akun yang dibuat: `admin-hsk@yopmail.com`.

### Yang dihapus dari `package.json`

`db:generate` dan `db:migrate` (keduanya drizzle-kit), beserta dependensi
`@libsql/client`, `drizzle-orm`, dan `drizzle-kit`.

## Berkas yang dihapus

| Berkas | Alasan |
| --- | --- |
| `src/db/schema.ts` | skema Drizzle |
| `src/db/client.server.ts` | koneksi Turso |
| `drizzle.config.ts`, `drizzle/` | migrasi SQL |
| `src/features/accounts/password.ts` + test | hashing scrypt, digantikan Firebase Auth |
| `src/features/admin/auth.server.ts` | sesi admin berbasis kata sandi bersama |
| `src/features/admin/auth.functions.ts` | RPC untuk sesi admin lama |
| `src/components/admin-login-form.tsx` | form kata sandi admin |
| `src/routes/admin/login.tsx` | admin sekarang masuk lewat `/masuk` |
| `src/components/account-form.tsx` | dipecah jadi register-form dan login-form |
| `tests/e2e/prepare-database.ts` | membangun basis data libSQL sekali pakai |
| `tests/vocabulary-server.test.ts` | 260 baris menguji lapisan Drizzle |

`src/db/firestore.server.ts` diperluas menjadi `src/db/firebase.server.ts`,
mengekspor `getFirestoreDb()`, `getAuth()`, dan `isFirebaseConfigured()`.

## Ikon dan favicon

Konsep: **kartu terbalik**. Dua kartu bertumpuk sedikit miring — satu tertutup
berwarna tinta, satu terbuka berwarna kertas — dengan titik merah di sudut kartu
depan yang mengulang tanda `.` pada wordmark Han.note. Langsung mengacu ke inti
aplikasinya: kartu yang dibalik.

Palet mengikuti tema yang sudah ada: tinta `#1c1b19`, kertas `#faf9f7`, merah
`#b3261e`.

Dibuat sebagai bentuk vektor murni tanpa elemen teks. Ini keputusan teknis, bukan
selera: SVG yang mengandung teks butuh font terpasang di mesin yang merender, dan
proses rasterisasi ke PNG/ICO akan menghasilkan hasil berbeda-beda — atau kosong
— tergantung ada tidaknya font CJK di sana.

Berkas yang dihasilkan:

| Berkas | Ukuran | Untuk |
| --- | --- | --- |
| `public/favicon.svg` | vektor | browser modern |
| `public/favicon.ico` | 16, 32, 48 | browser lama, bookmark |
| `public/icon-192.png` | 192×192 | manifest |
| `public/icon-512.png` | 512×512 | manifest, splash |
| `public/apple-touch-icon.png` | 180×180 | iOS home screen |
| `public/og-image.png` | 1200×630 | Open Graph, Twitter Card |

Varian 16px disederhanakan sendiri — kemiringan dikurangi dan titik merah
diperbesar relatif — karena detail yang bagus di 512px menjadi bubur di 16px.

Rasterisasi memakai `@resvg/resvg-js` sebagai devDependency, dijalankan lewat
`scripts/build-icons.ts` (`npm run icons:build`). Rasterizer berbasis Rust ini
tidak bergantung pada librsvg atau font sistem, yang penting justru karena
alasan yang sama dengan pilihan vektor-murni di atas. Berkas hasilnya di-commit,
jadi build produksi tidak menjalankannya.

`public/manifest.json` ditulis ulang — sekarang masih berisi `"short_name":
"TanStack App"` dan `"name": "Create TanStack App Sample"` bawaan template,
merujuk `logo192.png` dan `logo512.png` yang tidak ada di repo.

## SEO

Base URL: `https://flash-card.dhisapro.com`, disimpan di `src/lib/site.ts` dengan
env `SITE_URL` sebagai override.

### Meta per halaman

Setiap route mendefinisikan `head()`-nya sendiri dengan title dan description
unik. Sekarang hanya ada satu pasang global di `__root.tsx`, jadi keenam halaman
tampil identik di hasil pencarian.

| Route | Title | Sasaran |
| --- | --- | --- |
| `/` | Kosa Kata HSK 4 — 1.000 Kata dengan Arti Indonesia | "kosa kata hsk 4", "hsk 4 bahasa indonesia" |
| `/study` | Flashcard HSK 4 — Hafalkan Hanzi Satu per Satu | "flashcard hsk 4", "kartu hafalan hanzi" |
| `/quiz` | Quiz HSK 4 — Empat Mode Latihan Kosa Kata | "quiz hsk 4", "latihan soal hsk 4" |
| `/about` | Tentang Han.note dan Sumber Datanya | navigasi, kepercayaan |
| `/masuk` | Masuk ke Han.note | title dan description sendiri, tanpa sasaran kata kunci |
| `/daftar` | Daftar Akun Han.note | title dan description sendiri, tanpa sasaran kata kunci |
| `/admin` | — | `noindex, nofollow` |

Ditulis untuk pencari berbahasa Indonesia yang belajar HSK 4 — ceruk yang jauh
lebih sempit daripada "HSK 4" secara umum, dan justru karena itu bisa
dimenangkan.

### Tag teknis

- `<link rel="canonical">` di setiap halaman, absolut
- Open Graph lengkap: `og:type`, `og:title`, `og:description`, `og:image`,
  `og:url`, `og:locale` (`id_ID`), `og:site_name`
- Twitter Card `summary_large_image`
- `theme-color` `#faf9f7` menyamai warna kertas
- `<html lang="id">` — sudah benar, dipertahankan

### Data terstruktur

JSON-LD `WebApplication` di halaman utama:

```
name              Han.note
applicationCategory  EducationalApplication
inLanguage        id
isAccessibleForFree  true
description       …
```

Semuanya pernyataan yang benar tentang aplikasi ini. Structured data yang tidak
cocok dengan isi halaman adalah alasan penalti, bukan peringkat.

### `robots.txt` dan `sitemap.xml`

`robots.txt` sekarang mengizinkan semuanya tanpa menyebut sitemap. Diperbaiki
menjadi izin penuh untuk halaman publik, `Disallow: /admin`, dan baris
`Sitemap:` absolut.

`sitemap.xml` dilayani sebagai server route, bukan berkas statis, supaya tidak
bisa basi ketika route bertambah.

### Catatan jujur soal peringkat

Semua di atas membuat halaman **layak** naik dan tampil rapi di hasil pencarian.
Tidak ada satu pun yang menjamin posisi teratas — itu ditentukan konten,
backlink, dan waktu, dan tidak ada perubahan kode yang bisa membelinya. Yang
dikerjakan di sini adalah menghilangkan penghambat teknis dan menajamkan sasaran
kata kunci.

## Pengujian

### Vitest

Dipertahankan tanpa perubahan: `features/flashcards/session.test.ts`,
`features/quiz/{grade,streak,badges,build}.test.ts`,
`features/vocabulary/normalize.test.ts`, `tests/dataset.test.ts`. Semuanya
menguji logika murni yang tidak menyentuh basis data.

Dihapus: `tests/vocabulary-server.test.ts` (menguji Drizzle),
`features/accounts/password.test.ts` (menguji scrypt).

Ditambahkan, semuanya pada fungsi murni tanpa jaringan:

- pemetaan kode galat REST ke pesan dan field
- `registerSchema`, termasuk konfirmasi kata sandi yang tidak cocok
- pemetaan dokumen Firestore ke `VocabularyItem` dan sebaliknya
- perilaku kedaluwarsa dan invalidasi cache kosa kata
- `requireAdmin` menerima role admin dan menolak role user

### Playwright

Sesuai keputusan, spec yang bergantung pada basis data dipangkas:
`admin.spec.ts`, `flashcards.spec.ts`, dan `quiz.spec.ts` dihapus bersama
`prepare-database.ts` dan konfigurasi `webServer` yang menyiapkan libSQL.

Tersisa satu smoke spec yang tidak butuh data: halaman render tanpa galat
konsol, navigasi header bekerja, 404 tampil, validasi form daftar berjalan di
klien, dan tombol mata benar-benar mengubah `type` input.

Kehilangannya nyata dan perlu dicatat: tidak ada lagi jaring pengaman ujung-ke-
ujung untuk alur admin dan quiz. Kalau nanti terasa, jalur pemulihannya adalah
Firebase Emulator Suite.

## Variabel lingkungan

| Variabel | Nasib | Untuk |
| --- | --- | --- |
| `FIREBASE_PROJECT_ID` | tetap | Admin SDK |
| `FIREBASE_CLIENT_EMAIL` | tetap | Admin SDK |
| `FIREBASE_PRIVATE_KEY` | tetap | Admin SDK |
| `FIREBASE_API_KEY` | **baru** | REST `signInWithPassword` |
| `SITE_URL` | **baru** | canonical, OG, sitemap |
| `ADMIN_EMAIL` | **baru** | hanya `npm run admin:create` |
| `ADMIN_PASSWORD` | berubah fungsi | hanya `npm run admin:create`, tidak lagi dibaca saat runtime |
| `USER_SESSION_SECRET` | **dihapus** | sesi JWT buatan sendiri |
| `ADMIN_SESSION_SECRET` | **dihapus** | sesi admin buatan sendiri |
| `TURSO_DATABASE_URL` | **dihapus** | — |
| `TURSO_AUTH_TOKEN` | **dihapus** | — |
| `E2E_ADMIN_PASSWORD` | **dihapus** | spec-nya sudah tidak ada |

`.env.example` dan tabel environment di `README.md` disesuaikan.

## Risiko

**Pencabutan Turso tidak bisa dibatalkan begitu dependensinya hilang.** Karena
itu urutannya migrasi dulu, verifikasi jumlah dokumen, baru cabut. Basis data
Turso sendiri tidak dihapus oleh pekerjaan ini — dibiarkan utuh sebagai
cadangan sampai kamu sendiri yang menghapusnya.

**Kunci privat service account harus punya izin membuat session cookie.** Kunci
Firebase Admin standar sudah memilikinya. Kalau `createSessionCookie` menolak
dengan galat izin, penyebabnya adalah service account yang kehilangan peran
Service Account Token Creator.

**Login pertama setelah deploy adalah titik verifikasi paling penting.** Kalau
`FIREBASE_API_KEY` salah atau belum diatur di Vercel, pendaftaran berhasil di
Firebase Auth tapi gagal di langkah menerbitkan cookie — user terbuat tapi tidak
bisa masuk. Penanganannya sudah masuk di pemetaan galat, tapi env-nya tetap
harus diatur sebelum deploy.
