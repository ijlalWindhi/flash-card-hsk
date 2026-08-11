import { describe, expect, it } from "vitest"
import type { VocabularyItem } from "@/features/vocabulary/types"
import { isTypedPinyinCorrect, longestStreak, summariseQuiz } from "./grade"
import type { WordOutcome } from "./types"

const niHao: VocabularyItem = {
  id: "nihao",
  hanzi: "你好",
  pinyin: "nǐ hǎo",
  pinyinSortKey: "nihao",
  translationId: "halo",
  translationEn: "hello",
  kind: "official",
}

const lühang: VocabularyItem = {
  id: "lvxing",
  hanzi: "旅行",
  pinyin: "lǚ xíng",
  pinyinSortKey: "lüxing",
  translationId: "bepergian",
  translationEn: "to travel",
  kind: "official",
}

describe("isTypedPinyinCorrect", () => {
  it("accepts the reading without tone marks", () => {
    expect(isTypedPinyinCorrect("ni hao", niHao)).toBe(true)
  })

  it("accepts the reading with tone marks", () => {
    expect(isTypedPinyinCorrect("nǐ hǎo", niHao)).toBe(true)
  })

  it("forgives spacing and capitalisation", () => {
    expect(isTypedPinyinCorrect("  NiHao ", niHao)).toBe(true)
  })

  /* Neither `ü` nor a tone mark is on the keyboard most learners are using. */
  it("accepts v and u: as stand-ins for ü", () => {
    expect(isTypedPinyinCorrect("lv xing", lühang)).toBe(true)
    expect(isTypedPinyinCorrect("lu:xing", lühang)).toBe(true)
  })

  it("still rejects a different syllable", () => {
    expect(isTypedPinyinCorrect("ni hau", niHao)).toBe(false)
    expect(isTypedPinyinCorrect("lu xing", lühang)).toBe(false)
  })

  it("rejects an empty answer", () => {
    expect(isTypedPinyinCorrect("   ", niHao)).toBe(false)
  })
})

function outcome(wordId: string, correct: boolean): WordOutcome {
  return { wordId, hanzi: `汉${wordId}`, correct }
}

describe("longestStreak", () => {
  it("counts the longest run, not the last one", () => {
    expect(
      longestStreak([
        outcome("a", true),
        outcome("b", true),
        outcome("c", true),
        outcome("d", false),
        outcome("e", true),
      ])
    ).toBe(3)
  })

  it("is zero when nothing was right", () => {
    expect(longestStreak([outcome("a", false)])).toBe(0)
    expect(longestStreak([])).toBe(0)
  })
})

describe("summariseQuiz", () => {
  const deck: Array<VocabularyItem> = [niHao, lühang]

  it("counts every attempt, including repeats of one word", () => {
    const result = summariseQuiz(
      "match",
      "flashcard",
      [
        outcome("nihao", true),
        outcome("lvxing", false),
        outcome("lvxing", false),
      ],
      deck
    )

    expect(result.total).toBe(3)
    expect(result.correct).toBe(1)
  })

  it("lists a missed word once, in the order it was first seen", () => {
    const result = summariseQuiz(
      "choice",
      "random",
      [
        outcome("lvxing", false),
        outcome("nihao", false),
        outcome("lvxing", false),
      ],
      deck
    )

    expect(result.wrongWords.map((item) => item.id)).toEqual([
      "lvxing",
      "nihao",
    ])
  })

  it("leaves out words that were never missed", () => {
    const result = summariseQuiz(
      "typing",
      "selected",
      [outcome("nihao", true), outcome("lvxing", true)],
      deck
    )

    expect(result.wrongWords).toEqual([])
    expect(result.bestStreak).toBe(2)
  })

  /* A word answered from a deck that no longer holds it cannot be reviewed,
     and must not appear as an undefined row on the result screen. */
  it("drops an outcome whose word is not in the deck", () => {
    const result = summariseQuiz(
      "choice",
      "review",
      [outcome("ghost", false)],
      deck
    )

    expect(result.total).toBe(1)
    expect(result.wrongWords).toEqual([])
  })
})
