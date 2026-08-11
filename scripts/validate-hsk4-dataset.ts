/**
 * Data-quality gate for `data/hsk4-3.0.csv`.
 *
 * Run with `npm run data:validate`. Also imported by `tests/dataset.test.ts` and
 * by the seed script, so a malformed row can never reach the database.
 */
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parse } from "csv-parse/sync"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
export const DATASET_PATH = path.join(ROOT, "data", "hsk4-3.0.csv")

export const EXPECTED_SOURCE_VERSION = "2025-11"

export const CSV_COLUMNS = [
  "external_id",
  "hanzi",
  "pinyin",
  "translation_id",
  "translation_en",
  "source_name",
  "source_url",
  "source_version",
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
  rows: Array<VocabularyCsvRow>
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
    if (row.source_version !== EXPECTED_SOURCE_VERSION) {
      fail(
        `source_version is ${row.source_version}, expected ${EXPECTED_SOURCE_VERSION}`
      )
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
  const rows = loadDataset()
  const result = validateDataset(rows)

  for (const { line, reason } of result.invalidRows) {
    process.stderr.write(`${DATASET_PATH}:${line} ${reason}\n`)
  }
  for (const pair of result.duplicatePairs) {
    process.stderr.write(`duplicate entry: ${pair}\n`)
  }

  const problems = result.invalidRows.length + result.duplicatePairs.length
  if (problems > 0) {
    process.stderr.write(`\n${problems} problem(s) found\n`)
    process.exitCode = 1
    return
  }

  process.stdout.write(
    `${result.rowCount} sourced rows, 0 invalid, 0 duplicate` +
      `${result.homographPairs.length > 0 ? `, ${result.homographPairs.length} homograph(s): ${result.homographPairs.join(", ")}` : ""}\n`
  )
}

// Only run the CLI when invoked directly, not when imported by tests.
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main()
}
