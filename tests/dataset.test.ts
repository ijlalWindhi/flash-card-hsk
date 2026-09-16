import { describe, expect, it } from "vitest"
import {
  DATASET_PATH_HSK2,
  EXPECTED_SOURCE_VERSION_HSK2,
  loadDataset,
  validateDataset,
} from "../scripts/validate-hsk4-dataset"

describe("HSK 3.0 Level 4 dataset", () => {
  it("contains one thousand sourced, unique official entries", () => {
    const result = validateDataset(loadDataset())
    expect(result.rowCount).toBe(1000)
    expect(result.duplicatePairs).toEqual([])
    expect(result.invalidRows).toEqual([])
  })

  it("keeps the syllabus' one homograph as two distinguishable cards", () => {
    // 批 is listed twice at Level 4 — as a verb and as a classifier — so the
    // pair is expected. Any other collision means the build lost a sense.
    const result = validateDataset(loadDataset())
    expect(result.homographPairs).toEqual(["批 pī"])
  })

  it("carries provenance on every official row", () => {
    for (const row of loadDataset()) {
      expect(row.source_version).toBe("2025-11")
      expect(row.source_url.startsWith("https://")).toBe(true)
      expect(row.verified_at).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})

describe("HSK 2.0 Level 4 dataset", () => {
  const rows = () => loadDataset(DATASET_PATH_HSK2)

  it("contains the syllabus' six hundred newly-introduced words", () => {
    const result = validateDataset(rows(), EXPECTED_SOURCE_VERSION_HSK2)
    expect(result.rowCount).toBe(600)
    expect(result.duplicatePairs).toEqual([])
    expect(result.invalidRows).toEqual([])
    // Unlike the 3.0 syllabus, the 2012 list has no repeated headword.
    expect(result.homographPairs).toEqual([])
  })

  it("keeps its external IDs distinct from the 3.0 deck", () => {
    for (const row of rows()) {
      expect(row.external_id).toMatch(/^hsk2-4-\d{4}$/)
    }
  })
})

describe("both decks", () => {
  /**
   * Dictionary bookkeeping that a learner should never see on a card:
   * a classifier tag (`CL:`/`KP:`), a cross-reference standing in for a
   * meaning, or a pronunciation note. Each has leaked before.
   */
  it("never ships a gloss that is dictionary metadata", () => {
    for (const file of [undefined, DATASET_PATH_HSK2]) {
      for (const row of loadDataset(file)) {
        for (const column of ["translation_id", "translation_en"] as const) {
          expect(row[column]).not.toMatch(/[A-Z]{2,3}:/)
          for (const sense of row[column].split(";")) {
            expect(sense.trim()).not.toMatch(
              /^(?:varian\b|(?:[a-z]+ ){0,3}variant of\b|(?:juga|Taiwan|Beijing) dibaca\b|(?:also|Taiwan|Beijing) pr\.)/i
            )
          }
        }
      }
    }
  })
})
