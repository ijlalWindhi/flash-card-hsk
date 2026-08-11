import { describe, expect, it } from "vitest"
import type { VocabularyItem } from "@/features/vocabulary/types"
import { createStudySession } from "./session"

const items: Array<VocabularyItem> = ["a", "b", "c", "d", "e"].map((id) => ({
  id,
  hanzi: `汉${id}`,
  pinyin: `hàn${id}`,
  pinyinSortKey: `han${id}`,
  translationId: `arti ${id}`,
  translationEn: `meaning ${id}`,
  kind: "official",
}))

/** Deterministic stand-in for Math.random. */
function sequence(values: Array<number>): () => number {
  let index = 0
  return () => values[index++ % values.length]
}

describe("createStudySession", () => {
  it("uses selected IDs before it samples random words", () => {
    const session = createStudySession(items, ["b", "a"], 3, () => 0.5)
    expect(session.cards.map((card) => card.id)).toEqual(["a", "b"])
    expect(session.source).toBe("selected")
  })

  it("keeps the list's sorted order rather than the click order", () => {
    const session = createStudySession(items, ["e", "c", "a"], null, () => 0.5)
    expect(session.cards.map((card) => card.id)).toEqual(["a", "c", "e"])
  })

  it("ignores a selected ID that is not in the list", () => {
    const session = createStudySession(items, ["a", "ghost"], null, () => 0.5)
    expect(session.cards.map((card) => card.id)).toEqual(["a"])
  })

  it("samples the requested number of distinct cards at random", () => {
    const session = createStudySession(
      items,
      [],
      3,
      sequence([0.1, 0.9, 0.4, 0.7])
    )
    expect(session.source).toBe("random")
    expect(session.cards).toHaveLength(3)
    expect(new Set(session.cards.map((card) => card.id)).size).toBe(3)
  })

  it("can reach every item across many draws", () => {
    const seen = new Set<string>()
    for (let seed = 0; seed < 200; seed += 1) {
      // A cheap deterministic PRNG, so the test cannot flake.
      let state = seed + 1
      const random = () => {
        state = (state * 1103515245 + 12345) % 2147483648
        return state / 2147483648
      }
      for (const card of createStudySession(items, [], 1, random).cards) {
        seen.add(card.id)
      }
    }
    expect(seen.size).toBe(items.length)
  })

  it("never mutates the source list", () => {
    const order = items.map((entry) => entry.id)
    createStudySession(items, [], 5, sequence([0.9, 0.1, 0.5, 0.3, 0.7]))
    expect(items.map((entry) => entry.id)).toEqual(order)
  })

  it.each([0, -1, 6, 2.5, Number.NaN, null])(
    "rejects %p as a random card count",
    (bad) => {
      expect(() => createStudySession(items, [], bad, () => 0.5)).toThrow(
        RangeError
      )
      expect(() => createStudySession(items, [], bad, () => 0.5)).toThrow(
        "Jumlah kartu harus antara 1 dan 5."
      )
    }
  )
})
