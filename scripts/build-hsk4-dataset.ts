/**
 * Rebuilds the Level 4 seed CSVs from their upstream sources.
 *
 *   npm run data:build                    -> data/hsk4-3.0.csv (1000 words)
 *   npm run data:build -- --standard=2.0  -> data/hsk4-2.0.csv (600 words)
 *
 * Both standards share the same two dictionaries, so a card reads the same way
 * whichever syllabus it came from; only the word list differs. Sources are
 * cached under `.cache/hsk-sources/` (gitignored) so repeated runs do not
 * re-download ~20 MB. Pass `--refresh` to force a fresh download.
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

/** Keeps a flashcard readable when a dictionary entry has many senses. */
const MAX_SENSES = 3
const MAX_GLOSS_LENGTH = 160

const SOURCES = {
  hsk30: {
    url: "https://raw.githubusercontent.com/ivankra/hsk30/master/hsk30.csv",
    file: "hsk30.csv",
  },
  hsk20: {
    url: "https://raw.githubusercontent.com/glxxyz/hskhsk.com/master/data/lists/HSK%20Official%20With%20Definitions%202012%20L4.txt",
    file: "hsk20-l4.txt",
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

type Gloss = { en: string; id: string }

/**
 * The only two HSK 3.0 Level 4 words with no CC-CEDICT or CC-CIDICT entry.
 * Hand-authored here so the gap stays visible in review rather than buried in
 * the CSV.
 */
const MANUAL_GLOSSES_30: Record<string, Gloss> = {
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
 * The 2012 syllabus lists one verb phrase that neither dictionary carries as a
 * single entry: it is 弹 + 钢琴, which both dictionaries gloss separately.
 */
const MANUAL_GLOSSES_20: Record<string, Gloss> = {
  弹钢琴: {
    en: "to play the piano",
    id: "bermain piano;memainkan piano",
  },
}

/**
 * 批 is listed twice in the HSK 3.0 syllabus — once as a verb, once as a
 * classifier — with the same pinyin, and both dictionaries fold every sense
 * into a single entry. Selecting sense indices keeps the two cards
 * distinguishable.
 *
 * CC-CIDICT is a sense-for-sense translation of CC-CEDICT, so one index list
 * addresses the same meaning in both languages.
 */
const SENSE_OVERRIDES: Record<string, Array<number>> = {
  "hsk3-4-0556": [4, 5],
}

type StandardKey = "3.0" | "2.0"

type Standard = {
  out: string
  membership: (typeof SOURCES)["hsk30"] | (typeof SOURCES)["hsk20"]
  sourceName: string
  sourceUrl: string
  sourceVersion: string
  verifiedAt: string
  expectedRows: number
  manualGlosses: Record<string, Gloss>
}

const STANDARDS: Record<StandardKey, Standard> = {
  "3.0": {
    out: "hsk4-3.0.csv",
    membership: SOURCES.hsk30,
    sourceName: "CLEC 新版HSK考试大纲",
    sourceUrl:
      "https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf",
    sourceVersion: "2025-11",
    verifiedAt: "2026-09-16",
    expectedRows: 1000,
    manualGlosses: MANUAL_GLOSSES_30,
  },
  "2.0": {
    out: "hsk4-2.0.csv",
    membership: SOURCES.hsk20,
    // CLEC no longer hosts the 2012 syllabus PDF, so the fetchable authority
    // for membership is the transcription — see docs/dataset-provenance.md.
    sourceName: "Hanban 新汉语水平考试大纲 HSK四级 (2012)",
    sourceUrl: SOURCES.hsk20.url,
    sourceVersion: "2012",
    verifiedAt: "2026-09-16",
    expectedRows: 600,
    manualGlosses: MANUAL_GLOSSES_20,
  },
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

type DictIndex = {
  /** Keyed by simplified Hanzi + lowercased numeric pinyin. */
  byKey: Map<string, Array<DictEntry>>
  /** Keyed by simplified Hanzi alone, for resolving an unknown reading. */
  bySimplified: Map<string, Array<DictEntry>>
}

/**
 * Indexes a dictionary by simplified Hanzi plus lowercased numeric pinyin, and
 * by Hanzi alone.
 *
 * The traditional form is not part of the key: the syllabus transcription and
 * CC-CEDICT disagree on some variants (小伙子 vs 小夥子). Case is folded because
 * entries that double as proper nouns are capitalised (延長 vs 延长), but the
 * original case is kept per entry so an exact match can win at lookup time.
 */
function indexDictionary(text: string): DictIndex {
  const byKey = new Map<string, Array<DictEntry>>()
  const bySimplified = new Map<string, Array<DictEntry>>()
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#")) continue
    const match = DICT_LINE.exec(line)
    if (!match) continue
    const [, , simplified, numeric, body] = match
    const entry: DictEntry = { numeric, senses: splitSenses(body) }
    if (entry.senses.length === 0) continue
    push(byKey, dictKey(simplified, numeric), entry)
    push(bySimplified, simplified, entry)
  }
  return { byKey, bySimplified }
}

function push<T>(map: Map<string, Array<T>>, key: string, value: T): void {
  const bucket = map.get(key)
  if (bucket) bucket.push(value)
  else map.set(key, [value])
}

function dictKey(simplified: string, numeric: string): string {
  return `${simplified} ${numeric.toLowerCase()}`
}

/**
 * A classifier list is not a meaning. CC-CEDICT tags it `CL:`; CC-CIDICT
 * translates the tag to `KP:`, `KH:` or `SM:`. Those four are the only
 * all-caps tags in either corpus, and no real gloss opens with one.
 *
 * Case-sensitive on purpose — under /i this would also eat "to:" and "ke:".
 */
const CLASSIFIER_TAG = /^[A-Z]{2,3}:/

/**
 * The same tag also rides along inside a sense — "cutlass (CL:把)", or after a
 * comma once the upstream semicolon has been rewritten — where dropping the
 * whole sense would throw the meaning away with it.
 */
const INLINE_CLASSIFIER_TAG = /\s*[(,;]\s*[A-Z]{2,3}:[^)]*\)?/g

/**
 * Cross-references and pronunciation notes point at another headword instead
 * of translating this one. Both dictionaries qualify the variant marker —
 * "old variant of", "erhua variant of", "varian lama dari" — so the qualifier
 * has to be allowed for, not just the bare phrase.
 */
const NOT_A_GLOSS =
  /^\(?(?:see\b|lihat\b|varian\b|(?:also|Taiwan|Beijing) pr\.|(?:juga|Taiwan|Beijing) dibaca\b|(?:[a-z]+ ){0,3}variant of\b)/i

/** Splits one CC-CEDICT body into clean, learner-facing senses. */
function splitSenses(body: string): Array<string> {
  return (
    body
      .split("/")
      // Dropped before the trad|simp stripper runs, not after: that stripper
      // rewrites `CL:個|个[ge4]` to a bare `个`, destroying the very tag that
      // identifies the sense as a classifier list.
      .filter((sense) => !CLASSIFIER_TAG.test(sense.trimStart()))
      .map((sense) =>
        sense
          // 個|个[ge4] -> 个, and the bracket-less 兩個|两个 -> 两个
          .replace(/[^\s|[\]]+\|([^\s|[\]]+)(\[[^\]]*\])?/g, "$1")
          // leftover bare pinyin brackets
          .replace(/\[[^\]]*\]/g, "")
          .replace(INLINE_CLASSIFIER_TAG, "")
          .replace(/\s+/g, " ")
          .trim()
      )
      .filter((sense) => sense.length > 0 && !NOT_A_GLOSS.test(sense))
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

/**
 * Takes senses from each reading in turn, so a word the syllabus lists under
 * two readings (空 kōng / kòng) does not spend its whole card on the first one.
 */
function interleave(lists: Array<Array<string>>): Array<string> {
  if (lists.length === 1) return lists[0]
  const merged: Array<string> = []
  const longest = Math.max(0, ...lists.map((list) => list.length))
  for (let i = 0; i < longest; i++) {
    for (const list of lists) if (list[i]) merged.push(list[i])
  }
  return merged
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

/** Tone-marked vowels, indexed by tone 1–4; tone 5 (neutral) carries no mark. */
const TONE_MARKS: Record<string, string> = {
  a: "āáǎà",
  e: "ēéěè",
  i: "īíǐì",
  o: "ōóǒò",
  u: "ūúǔù",
  ü: "ǖǘǚǜ",
}

/**
 * `ai4 qing2` -> `àiqíng`.
 *
 * Converting in this direction is deterministic; the reverse is not, which is
 * why the 2012 list is matched to CC-CEDICT by rendering the dictionary's own
 * numeric pinyin rather than by parsing the list's (tone marks are unambiguous,
 * syllable boundaries in an unspaced romanisation are not).
 */
function toneMark(syllable: string): string {
  const match = /^([a-z:]+)([1-5])$/i.exec(syllable)
  if (!match) return syllable.toLowerCase().replace(/u:/g, "ü")

  const base = match[1].toLowerCase().replace(/u:/g, "ü")
  const tone = Number(match[2])
  if (tone === 5) return base

  // Mandarin rule: a, o and e always take the mark; otherwise the last vowel
  // does (jiù, huì, lǜ).
  const priority = ["a", "o", "e"].find((vowel) => base.includes(vowel))
  const at = priority
    ? base.indexOf(priority)
    : Math.max(
        base.lastIndexOf("i"),
        base.lastIndexOf("u"),
        base.lastIndexOf("ü")
      )
  if (at < 0) return base
  return base.slice(0, at) + TONE_MARKS[base[at]][tone - 1] + base.slice(at + 1)
}

function toneMarked(numeric: string): string {
  return numeric.split(/\s+/).map(toneMark).join("")
}

/** Folds away spacing and punctuation so two transcriptions can be compared. */
function normalizePinyin(value: string): string {
  return value.toLowerCase().replace(/[\s'’·\-.]/g, "")
}

/** Also folds away tone marks, for lists that write sandhi or a neutral tone. */
function stripTones(value: string): string {
  return normalizePinyin(value)
    .normalize("NFD")
    .replace(/\p{Mark}/gu, "")
}

type Membership = {
  externalId: string
  hanzi: string
  pinyin: string
  /**
   * The `(simplified, numeric pinyin)` pairs to look the word up under. More
   * than one when the syllabus lists a word under two readings.
   */
  keys: Array<{ simplified: string; numeric: string }>
  senseOverrides?: Array<number>
}

type HskRow = {
  ID: string
  Simplified: string
  Pinyin: string
  Level: string
  CEDICT: string
}

/** HSK 3.0: the syllabus transcription already carries a CC-CEDICT key. */
function readHsk30(raw: Buffer): Array<Membership> {
  const rows = parse(raw.toString("utf8"), {
    columns: true,
    skip_empty_lines: true,
  }) as Array<HskRow>

  return rows
    .filter((row) => row.Level === "4")
    .map((row) => {
      const externalId = row.ID.replace(/^L(\d+)-/, "hsk3-$1-")
      // A cell can hold several traditional spellings of one word; they share a
      // definition, so the first reference is enough.
      const reference = parseReference(
        row.CEDICT.split("/").filter(Boolean)[0] ?? ""
      )
      return {
        externalId,
        hanzi: row.Simplified,
        pinyin: row.Pinyin,
        keys: reference ? [reference] : [],
        senseOverrides: SENSE_OVERRIDES[externalId],
      }
    })
}

/**
 * HSK 2.0: the 2012 list is `simplified \t traditional \t numeric \t marked \t
 * definition`. Its numeric column drops neutral tones and has transcription
 * errors (参观 is written `cang1uan1`), so only the tone-marked column is
 * trusted, and the dictionary key is recovered by rendering each CC-CEDICT
 * reading of the same Hanzi and keeping the one that matches.
 */
function readHsk20(raw: Buffer, english: DictIndex): Array<Membership> {
  const lines = raw
    .toString("utf8")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)

  return lines.map((line, index) => {
    const [hanzi, , , marked] = line.split("\t")
    const pinyin = marked.trim()
    const candidates = english.bySimplified.get(hanzi) ?? []

    // `dǎo, dào` — the syllabus lists one word under two readings.
    const keys = pinyin
      .split(",")
      .map((reading) => matchReading(candidates, reading.trim()))
      .filter((numeric): numeric is string => numeric !== null)
      .map((numeric) => ({ simplified: hanzi, numeric }))

    return {
      externalId: `hsk2-4-${String(index + 1).padStart(4, "0")}`,
      hanzi,
      pinyin,
      keys,
    }
  })
}

/**
 * CC-CEDICT capitalises the reading of a proper noun, so 干 carries both
 * `Gan1` ("surname Gan") and `gan1` ("dry"). The syllabus means the common
 * word, so a lower-case reading wins whenever one spells the same sound.
 */
function preferCommonNoun(entries: Array<DictEntry>): DictEntry | undefined {
  return (
    entries.find((entry) => entry.numeric === entry.numeric.toLowerCase()) ??
    entries[0]
  )
}

/** Finds the CC-CEDICT reading of a Hanzi that the syllabus is transcribing. */
function matchReading(
  candidates: Array<DictEntry>,
  reading: string
): string | null {
  const exact = candidates.filter(
    (entry) =>
      normalizePinyin(toneMarked(entry.numeric)) === normalizePinyin(reading)
  )
  // The 2012 list writes tone sandhi (búguò) and neutral-tone variants (fùqin)
  // that CC-CEDICT spells with the citation tone, so fall back to the syllables.
  const relaxed = candidates.filter(
    (entry) => stripTones(toneMarked(entry.numeric)) === stripTones(reading)
  )
  return (preferCommonNoun(exact) ?? preferCommonNoun(relaxed))?.numeric ?? null
}

async function main() {
  const refresh = process.argv.includes("--refresh")
  const flag = process.argv
    .find((arg) => arg.startsWith("--standard="))
    ?.slice("--standard=".length)
  if (flag && !(flag in STANDARDS)) {
    throw new Error(
      `unknown --standard=${flag}; expected one of ${Object.keys(STANDARDS).join(", ")}`
    )
  }
  const standard = STANDARDS[(flag as StandardKey | undefined) ?? "3.0"]
  const out = path.join(ROOT, "data", standard.out)

  const [membershipRaw, cedictRaw, cidictRaw] = await Promise.all([
    download(standard.membership.url, standard.membership.file, refresh),
    download(SOURCES.cedict.url, SOURCES.cedict.file, refresh),
    download(SOURCES.cidict.url, SOURCES.cidict.file, refresh),
  ])

  const english = indexDictionary(gunzipSync(cedictRaw).toString("utf8"))
  const indonesian = indexDictionary(cidictRaw.toString("utf8"))

  const words =
    standard.membership === SOURCES.hsk30
      ? readHsk30(membershipRaw)
      : readHsk20(membershipRaw, english)

  if (words.length !== standard.expectedRows) {
    throw new Error(
      `expected ${standard.expectedRows} Level 4 rows in ${standard.membership.file}, found ${words.length}`
    )
  }

  const lines = [
    "external_id,hanzi,pinyin,translation_id,translation_en,source_name,source_url,source_version,verified_at",
  ]
  const unresolved: Array<string> = []

  for (const word of words) {
    const manual = standard.manualGlosses[word.hanzi]
    const gloss = (index: DictIndex) =>
      formatSenses(
        interleave(
          word.keys.map(({ simplified, numeric }) =>
            lookupSenses(index.byKey, simplified, numeric)
          )
        ),
        word.senseOverrides
      )

    const translationEn =
      manual?.en ?? (word.keys.length > 0 ? gloss(english) : "")
    const translationId =
      manual?.id ?? (word.keys.length > 0 ? gloss(indonesian) : "")

    if (!translationEn || !translationId) {
      unresolved.push(
        `${word.externalId} ${word.hanzi} ${word.pinyin} (${
          word.keys.map((key) => key.numeric).join(" / ") || "no dictionary key"
        })`
      )
      continue
    }

    lines.push(
      [
        word.externalId,
        word.hanzi,
        word.pinyin,
        translationId,
        translationEn,
        standard.sourceName,
        standard.sourceUrl,
        standard.sourceVersion,
        standard.verifiedAt,
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
  await writeFile(out, csv, "utf8")

  const digest = createHash("sha256").update(csv).digest("hex").slice(0, 16)
  process.stdout.write(
    `wrote ${path.relative(ROOT, out)} — ${lines.length - 1} rows, sha256:${digest}\n`
  )
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`
  )
  process.exitCode = 1
})
