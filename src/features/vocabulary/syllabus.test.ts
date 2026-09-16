import { describe, expect, it } from "vitest"
import {
  SYLLABUSES,
  SYLLABUS_LIST,
  syllabusFromPath,
  syllabusPath,
} from "./syllabus"
import type { SyllabusPage } from "./syllabus"

const PAGES: Array<SyllabusPage> = ["list", "study", "quiz"]

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

  it("gives the two syllabuses no path in common", () => {
    const paths = SYLLABUS_LIST.flatMap((syllabus) =>
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
    for (const syllabus of SYLLABUS_LIST) {
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
  })
})
