import { describe, expect, it } from "vitest"
import { loadDataset, validateDataset } from "../scripts/validate-hsk4-dataset"

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
