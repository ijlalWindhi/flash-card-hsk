import { describe, expect, it } from "vitest"
import {
  SYLLABUSES,
  SYLLABUS_LIST,
  levelsOf,
  syllabusFromPath,
  syllabusPath,
} from "./syllabus"
import type { SyllabusPage } from "./syllabus"

const PAGES: Array<SyllabusPage> = ["list", "study", "quiz"]
const ALL = Object.values(SYLLABUSES)

describe("syllabusPath", () => {
  it("keeps the 3.0 syllabus at the paths the site already publishes", () => {
    const hsk3 = SYLLABUSES["3.0"]
    expect(syllabusPath(hsk3)).toBe("/")
    expect(syllabusPath(hsk3, "study")).toBe("/study")
    expect(syllabusPath(hsk3, "quiz")).toBe("/quiz")
  })

  it("puts the 2.0 syllabus under its own prefix", () => {
    const hsk2 = SYLLABUSES["2.0"]
    expect(syllabusPath(hsk2)).toBe("/hsk2")
    expect(syllabusPath(hsk2, "study")).toBe("/hsk2/study")
    expect(syllabusPath(hsk2, "quiz")).toBe("/hsk2/quiz")
  })

  it("puts HSK 2.0 Level 5 under a level segment of the 2.0 prefix", () => {
    const hsk2l5 = SYLLABUSES["2.0-5"]
    expect(syllabusPath(hsk2l5)).toBe("/hsk2/5")
    expect(syllabusPath(hsk2l5, "study")).toBe("/hsk2/5/study")
    expect(syllabusPath(hsk2l5, "quiz")).toBe("/hsk2/5/quiz")
  })

  it("gives no two word lists a path in common", () => {
    const paths = ALL.flatMap((syllabus) =>
      PAGES.map((page) => syllabusPath(syllabus, page))
    )
    expect(new Set(paths).size).toBe(paths.length)
  })
})

describe("syllabusFromPath", () => {
  /**
   * The switcher highlights whatever this returns, and each page reads its
   * words from the syllabus its URL names. If the two ever disagree, a learner
   * sees one syllabus' words under the other's address.
   */
  it("round-trips every path back to the syllabus that owns it", () => {
    for (const syllabus of ALL) {
      for (const page of PAGES) {
        expect(syllabusFromPath(syllabusPath(syllabus, page)).id).toBe(
          syllabus.id
        )
      }
    }
  })

  it("reads a page belonging to neither syllabus as the default", () => {
    for (const path of ["/about", "/masuk", "/daftar", "/admin"]) {
      expect(syllabusFromPath(path).id).toBe("3.0")
    }
  })

  it("matches the prefix as a path segment, not as a string prefix", () => {
    // `/hsk2024` starts with `/hsk2` but is not inside it.
    expect(syllabusFromPath("/hsk2024").id).toBe("3.0")
    expect(syllabusFromPath("/hsk2-lama").id).toBe("3.0")
    expect(syllabusFromPath("/hsk2/study").id).toBe("2.0")
    expect(syllabusFromPath("/hsk2/50").id).toBe("2.0")
  })
})

describe("levelsOf", () => {
  it("offers HSK 2.0 at Levels 4 and 5, and HSK 3.0 at Level 4 only", () => {
    for (const id of ["2.0", "2.0-5"] as const) {
      expect(levelsOf(SYLLABUSES[id]).map((s) => s.level)).toEqual([4, 5])
    }
    expect(levelsOf(SYLLABUSES["3.0"]).map((s) => s.level)).toEqual([4])
  })

  it("lists one switcher entry per syllabus, at its first level", () => {
    for (const syllabus of SYLLABUS_LIST) {
      expect(levelsOf(syllabus)[0]).toBe(syllabus)
    }
  })
})
