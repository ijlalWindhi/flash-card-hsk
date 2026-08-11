/**
 * Rebuilds `data/hsk4-3.0.csv` from its three upstream sources.
 *
 * Run with `npm run data:build`. Sources are cached under `.cache/hsk-sources/`
 * (gitignored) so repeated runs do not re-download ~20 MB. Pass `--refresh` to
 * force a fresh download.
 *
 * Provenance for every field is documented in docs/dataset-provenance.md.
 */
import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { gunzipSync } from "node:zlib"
import { parse } from "csv-parse/sync"

const ROOT = path.resolve(import.meta.dirname, "..")
const CACHE = path.join(ROOT, ".cache", "hsk-sources")
const OUT = path.join(ROOT, "data", "hsk4-3.0.csv")

/** The syllabus that decides which words are Level 4. */
const SOURCE_NAME = "CLEC 新版HSK考试大纲"
const SOURCE_URL =
  "https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf"
const SOURCE_VERSION = "2025-11"
const VERIFIED_AT = "2026-08-11"

/** Keeps a flashcard readable when a dictionary entry has many senses. */
const MAX_SENSES = 3
const MAX_GLOSS_LENGTH = 160

const SOURCES = {
  hsk30: {
    url: "https://raw.githubusercontent.com/ivankra/hsk30/master/hsk30.csv",
    file: "hsk30.csv",
  },
  cedict: {
    url: "https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz",
    file: "cedict.txt.gz",
  },
  cidict: {
    url: "https://cidict.org/download/u8",
    file: "cidict.u8",
  },
} as const

/**
 * The only two Level 4 words with no CC-CEDICT or CC-CIDICT entry. Hand-authored
 * here so the gap stays visible in review rather than buried in the CSV.
 */
const MANUAL_GLOSSES: Record<string, { en: string; id: string }> = {
  眼里: {
    en: "in one's eyes;in one's view",
    id: "di mata seseorang;menurut pandangan",
  },
  有劲儿: {
    en: "strong;energetic;full of strength",
    id: "bertenaga;kuat;bersemangat",
  },
}

/**
 * 批 is listed twice in the syllabus — once as a verb, once as a classifier —
 * with the same pinyin, and both dictionaries fold every sense into a single
 * entry. Selecting sense indices keeps the two cards distinguishable.
 *
 * CC-CIDICT is a sense-for-sense translation of CC-CEDICT, so one index list
 * addresses the same meaning in both languages.
 */
const SENSE_OVERRIDES: Record<string, Array<number>> = {
  "hsk3-4-0556": [4, 5],
}

async function download(
  url: string,
  file: string,
  refresh: boolean
): Promise<Buffer> {
  const target = path.join(CACHE, file)
  if (!refresh && existsSync(target)) return readFile(target)

  process.stderr.write(`fetching ${url}\n`)
  const response = await fetch(url, {
    headers: {
      // cidict.org rejects requests without a browser user agent.
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
  })
  if (!response.ok) {
    throw new Error(
      `${url} responded ${response.status} ${response.statusText}`
    )
  }
  const body = Buffer.from(await response.arrayBuffer())
  await mkdir(CACHE, { recursive: true })
  await writeFile(target, body)
  return body
}

/** CC-CEDICT line: `TRAD SIMP [numeric pinyin] /sense/sense/`. */
const DICT_LINE = /^(\S+)\s(\S+)\s\[([^\]]*)\]\s\/(.*)\/\s*$/

type DictEntry = { numeric: string; senses: Array<string> }

/**
 * Indexes a dictionary by simplified Hanzi plus lowercased numeric pinyin.
 *
 * The traditional form is not part of the key: the syllabus transcription and
 * CC-CEDICT disagree on some variants (小伙子 vs 小夥子). Case is folded because
 * entries that double as proper nouns are capitalised (延長 vs 延长), but the
 * original case is kept per entry so an exact match can win at lookup time.
 */
function indexDictionary(text: string): Map<string, Array<DictEntry>> {
  const index = new Map<string, Array<DictEntry>>()
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#")) continue
    const match = DICT_LINE.exec(line)
    if (!match) continue
    const [, , simplified, numeric, body] = match
    const entry: DictEntry = { numeric, senses: splitSenses(body) }
    if (entry.senses.length === 0) continue
    const key = dictKey(simplified, numeric)
    const bucket = index.get(key)
    if (bucket) bucket.push(entry)
    else index.set(key, [entry])
  }
  return index
}

function dictKey(simplified: string, numeric: string): string {
  return `${simplified} ${numeric.toLowerCase()}`
}

/** Splits one CC-CEDICT body into clean, learner-facing senses. */
function splitSenses(body: string): Array<string> {
  return (
    body
      .split("/")
      .map((sense) =>
        sense
          // 個|个[ge4] -> 个, and the bracket-less 兩個|两个 -> 两个
          .replace(/[^\s|[\]]+\|([^\s|[\]]+)(\[[^\]]*\])?/g, "$1")
          // leftover bare pinyin brackets
          .replace(/\[[^\]]*\]/g, "")
          .replace(/\s+/g, " ")
          .trim()
      )
      .filter(
        (sense) =>
          sense.length > 0 &&
          !sense.startsWith("CL:") &&
          // cross-references and pronunciation notes are not study glosses
          !/^(see|lihat|Taiwan pr\.|also pr\.|variant of|varian dari)\b/i.test(
            sense
          )
      )
      // `;` is our sense delimiter, so it must not survive inside a sense.
      .map((sense) => sense.replace(/;/g, ","))
  )
}

/**
 * Picks the sense set for one syllabus row. An exact pinyin-case match wins so
 * a common noun is not shadowed by a same-spelling place name.
 */
function lookupSenses(
  index: Map<string, Array<DictEntry>>,
  simplified: string,
  numeric: string
): Array<string> {
  const candidates = index.get(dictKey(simplified, numeric)) ?? []
  const exact = candidates.find((entry) => entry.numeric === numeric)
  return (exact ?? candidates[0])?.senses ?? []
}

/** Joins senses into one CSV cell, bounded by sense count and character length. */
function formatSenses(senses: Array<string>, indices?: Array<number>): string {
  const picked = (
    indices ? indices.map((i) => senses[i]).filter(Boolean) : senses
  ).slice(0, MAX_SENSES)
  if (picked.length === 0) return ""

  const kept: Array<string> = []
  for (const sense of picked) {
    const next = [...kept, sense].join(";")
    if (kept.length > 0 && next.length > MAX_GLOSS_LENGTH) break
    kept.push(sense)
  }

  const joined = kept.join(";")
  if (joined.length <= MAX_GLOSS_LENGTH) return joined

  // A single sense can still run long; cut it at a clause boundary.
  const cut = joined.lastIndexOf(", ", MAX_GLOSS_LENGTH)
  return (
    cut > 40 ? joined.slice(0, cut) : joined.slice(0, MAX_GLOSS_LENGTH)
  ).trim()
}

/** Parses one `TRAD|SIMP[pin1 yin1]` reference from the syllabus CEDICT column. */
function parseReference(
  reference: string
): { simplified: string; numeric: string } | null {
  const match = /^[^|]*\|([^[]+)\[([^\]]*)\]$/.exec(reference.trim())
  return match ? { simplified: match[1], numeric: match[2] } : null
}

function toCsvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

type HskRow = {
  ID: string
  Simplified: string
  Pinyin: string
  Level: string
  CEDICT: string
}

async function main() {
  const refresh = process.argv.includes("--refresh")

  const [hskRaw, cedictRaw, cidictRaw] = await Promise.all([
    download(SOURCES.hsk30.url, SOURCES.hsk30.file, refresh),
    download(SOURCES.cedict.url, SOURCES.cedict.file, refresh),
    download(SOURCES.cidict.url, SOURCES.cidict.file, refresh),
  ])

  const hskRows = parse(hskRaw.toString("utf8"), {
    columns: true,
    skip_empty_lines: true,
  }) as Array<HskRow>

  const level4 = hskRows.filter((row) => row.Level === "4")
  if (level4.length !== 1000) {
    throw new Error(
      `expected 1000 Level 4 rows in hsk30.csv, found ${level4.length}`
    )
  }

  const english = indexDictionary(gunzipSync(cedictRaw).toString("utf8"))
  const indonesian = indexDictionary(cidictRaw.toString("utf8"))

  const lines = [
    "external_id,hanzi,pinyin,translation_id,translation_en,source_name,source_url,source_version,verified_at",
  ]
  const unresolved: Array<string> = []

  for (const row of level4) {
    const externalId = row.ID.replace(/^L(\d+)-/, "hsk3-$1-")
    const manual = MANUAL_GLOSSES[row.Simplified]
    // A cell can hold several traditional spellings of one word; they share a
    // definition, so the first reference is enough.
    const reference = parseReference(
      row.CEDICT.split("/").filter(Boolean)[0] ?? ""
    )
    const overrides = SENSE_OVERRIDES[externalId]

    const translationEn =
      manual?.en ??
      formatSenses(
        reference
          ? lookupSenses(english, reference.simplified, reference.numeric)
          : [],
        overrides
      )
    const translationId =
      manual?.id ??
      formatSenses(
        reference
          ? lookupSenses(indonesian, reference.simplified, reference.numeric)
          : [],
        overrides
      )

    if (!translationEn || !translationId) {
      unresolved.push(
        `${row.ID} ${row.Simplified} (${row.CEDICT || "no dictionary key"})`
      )
      continue
    }

    lines.push(
      [
        externalId,
        row.Simplified,
        row.Pinyin,
        translationId,
        translationEn,
        SOURCE_NAME,
        SOURCE_URL,
        SOURCE_VERSION,
        VERIFIED_AT,
      ]
        .map(toCsvField)
        .join(",")
    )
  }

  if (unresolved.length > 0) {
    process.stderr.write(
      `unresolved rows (${unresolved.length}):\n  ${unresolved.join("\n  ")}\n`
    )
    throw new Error(
      "every Level 4 row needs both an Indonesian and an English gloss"
    )
  }

  const csv = `${lines.join("\n")}\n`
  await writeFile(OUT, csv, "utf8")

  const digest = createHash("sha256").update(csv).digest("hex").slice(0, 16)
  process.stdout.write(
    `wrote ${path.relative(ROOT, OUT)} — ${lines.length - 1} rows, sha256:${digest}\n`
  )
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`
  )
  process.exitCode = 1
})
