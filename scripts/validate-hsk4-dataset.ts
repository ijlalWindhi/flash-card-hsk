/**
 * Data-quality gate for the seed CSVs.
 *
 * Run with `npm run data:validate`. Also imported by `tests/dataset.test.ts` and
 * by the seed script, so a malformed row can never reach the database.
 */
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parse } from "csv-parse/sync"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

/** The deck the application seeds from. */
export const DATASET_PATH = path.join(ROOT, "data", "hsk4-3.0.csv")
/** The HSK 2.0 Level 4 deck — built and validated, not yet seeded. */
export const DATASET_PATH_HSK2 = path.join(ROOT, "data", "hsk4-2.0.csv")

/** The HSK 2.0 Level 5 deck. */
export const DATASET_PATH_HSK2_L5 = path.join(ROOT, "data", "hsk5-2.0.csv")

export const EXPECTED_SOURCE_VERSION = "2025-11"
export const EXPECTED_SOURCE_VERSION_HSK2 = "2012"

/**
 * Every dataset this gate knows about — and so every one `npm run db:seed`
 * imports — with the level and row count each must hold.
 */
export const DATASETS = [
  {
    file: DATASET_PATH,
    sourceVersion: EXPECTED_SOURCE_VERSION,
    level: 4,
    expectedRows: 1000,
  },
  {
    file: DATASET_PATH_HSK2,
    sourceVersion: EXPECTED_SOURCE_VERSION_HSK2,
    level: 4,
    expectedRows: 600,
  },
  {
    file: DATASET_PATH_HSK2_L5,
    sourceVersion: EXPECTED_SOURCE_VERSION_HSK2,
    level: 5,
    expectedRows: 1300,
  },
] as const

export const CSV_COLUMNS = [
  "external_id",
  "hanzi",
  "pinyin",
  "translation_id",
  "translation_en",
  "source_name",
  "source_url",
  "source_version",
  "hsk_level",
  "verified_at",
] as const

export type VocabularyCsvRow = Record<(typeof CSV_COLUMNS)[number], string>

export type DatasetValidationResult = {
  rowCount: number
  /**
   * Rows a learner could not tell apart: same Hanzi, same pinyin *and* the same
   * English gloss. Always empty in a healthy file.
   */
  duplicatePairs: Array<string>
  /**
   * Rows sharing Hanzi and pinyin but carrying different meanings. The syllabus
   * legitimately contains one (批, as verb and as classifier), which is why the
   * database scopes its `(hanzi, pinyin)` unique index to manual entries.
   */
  homographPairs: Array<string>
  invalidRows: Array<{ line: number; reason: string }>
}

export function loadDataset(
  file: string = DATASET_PATH
): Array<VocabularyCsvRow> {
  const rows = parse(readFileSync(file, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  }) as Array<VocabularyCsvRow>

  const [first] = rows
  if (first) {
    const missing = CSV_COLUMNS.filter((column) => !(column in first))
    if (missing.length > 0) {
      throw new Error(`${file} is missing column(s): ${missing.join(", ")}`)
    }
  }
  return rows
}

/** Any Latin letter, including the tone-marked and diaeresis vowels pinyin uses. */
const LATIN_LETTER = /\p{Script=Latin}/u

function describeRow(row: VocabularyCsvRow): string {
  return `${row.hanzi} ${row.pinyin}`
}

export function validateDataset(
  rows: Array<VocabularyCsvRow>,
  expectedSourceVersion: string = EXPECTED_SOURCE_VERSION,
  expectedLevel: number = 4
): DatasetValidationResult {
  const invalidRows: Array<{ line: number; reason: string }> = []
  const duplicatePairs: Array<string> = []
  const homographPairs: Array<string> = []

  const seenIdentical = new Set<string>()
  const seenPairs = new Set<string>()
  const seenExternalIds = new Set<string>()

  rows.forEach((row, index) => {
    // Line 1 is the header, so the first data row is line 2.
    const line = index + 2
    const fail = (reason: string) => invalidRows.push({ line, reason })

    for (const column of CSV_COLUMNS) {
      if (!row[column]?.trim()) fail(`empty ${column}`)
    }

    if (row.pinyin && !LATIN_LETTER.test(row.pinyin)) {
      fail(`pinyin has no Latin letter: ${row.pinyin}`)
    }
    if (row.source_url && !row.source_url.startsWith("https://")) {
      fail(`source_url is not HTTPS: ${row.source_url}`)
    }
    if (row.source_version !== expectedSourceVersion) {
      fail(
        `source_version is ${row.source_version}, expected ${expectedSourceVersion}`
      )
    }
    // Two decks share `source_version` 2012; the level is what keeps them apart.
    if (row.hsk_level !== String(expectedLevel)) {
      fail(`hsk_level is ${row.hsk_level}, expected ${expectedLevel}`)
    }
    if (row.verified_at && !/^\d{4}-\d{2}-\d{2}$/.test(row.verified_at)) {
      fail(`verified_at is not an ISO date: ${row.verified_at}`)
    }

    if (row.external_id) {
      if (seenExternalIds.has(row.external_id)) {
        fail(`duplicate external_id: ${row.external_id}`)
      }
      seenExternalIds.add(row.external_id)
    }

    const pairKey = `${row.hanzi}\u0000${row.pinyin}`
    const identicalKey = `${pairKey}\u0000${row.translation_en}`
    if (seenIdentical.has(identicalKey)) {
      duplicatePairs.push(describeRow(row))
    } else if (seenPairs.has(pairKey)) {
      homographPairs.push(describeRow(row))
    }
    seenIdentical.add(identicalKey)
    seenPairs.add(pairKey)
  })

  return { rowCount: rows.length, duplicatePairs, homographPairs, invalidRows }
}

function main() {
  let problems = 0

  for (const dataset of DATASETS) {
    const result = validateDataset(
      loadDataset(dataset.file),
      dataset.sourceVersion,
      dataset.level
    )
    const name = path.basename(dataset.file)

    for (const { line, reason } of result.invalidRows) {
      process.stderr.write(`${dataset.file}:${line} ${reason}\n`)
    }
    for (const pair of result.duplicatePairs) {
      process.stderr.write(`${name}: duplicate entry: ${pair}\n`)
    }
    if (result.rowCount !== dataset.expectedRows) {
      process.stderr.write(
        `${name}: ${result.rowCount} rows, expected ${dataset.expectedRows}\n`
      )
    }

    problems +=
      result.invalidRows.length +
      result.duplicatePairs.length +
      (result.rowCount === dataset.expectedRows ? 0 : 1)

    const homographs =
      result.homographPairs.length > 0
        ? `, ${result.homographPairs.length} homograph(s): ${result.homographPairs.join(", ")}`
        : ""
    process.stdout.write(
      `${name}: ${result.rowCount} sourced rows, ${result.invalidRows.length} invalid, ` +
        `${result.duplicatePairs.length} duplicate${homographs}\n`
    )
  }

  if (problems > 0) {
    process.stderr.write(`\n${problems} problem(s) found\n`)
    process.exitCode = 1
  }
}

// Only run the CLI when invoked directly, not when imported by tests.
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main()
}
