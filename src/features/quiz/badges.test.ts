import { describe, expect, it } from "vitest"
import { BADGES, earnedBadgeIds } from "./badges"
import type { BadgeContext } from "./badges"

const nothing: BadgeContext = {
  totalQuizzes: 0,
  totalCorrect: 0,
  bestStreak: 0,
  dailyStreak: 0,
  modesPlayed: [],
  hadPerfectSession: false,
}

describe("BADGES", () => {
  it("has no duplicate ids", () => {
    expect(new Set(BADGES.map((badge) => badge.id)).size).toBe(BADGES.length)
  })
})

describe("earnedBadgeIds", () => {
  it("awards nothing before the first quiz", () => {
    expect(earnedBadgeIds(nothing)).toEqual([])
  })

  it("awards the first-quiz badge as soon as one is finished", () => {
    expect(earnedBadgeIds({ ...nothing, totalQuizzes: 1 })).toContain(
      "first-quiz"
    )
  })

  it("awards each badge only at its threshold", () => {
    expect(earnedBadgeIds({ ...nothing, bestStreak: 9 })).not.toContain(
      "streak-10"
    )
    expect(earnedBadgeIds({ ...nothing, bestStreak: 10 })).toContain(
      "streak-10"
    )
    expect(earnedBadgeIds({ ...nothing, totalCorrect: 99 })).not.toContain(
      "correct-100"
    )
    expect(earnedBadgeIds({ ...nothing, totalCorrect: 100 })).toContain(
      "correct-100"
    )
    expect(earnedBadgeIds({ ...nothing, dailyStreak: 6 })).not.toContain(
      "daily-7"
    )
    expect(earnedBadgeIds({ ...nothing, dailyStreak: 7 })).toContain("daily-7")
  })

  it("needs all four modes, not four plays of one", () => {
    expect(
      earnedBadgeIds({ ...nothing, modesPlayed: ["choice", "choice"] })
    ).not.toContain("all-modes")
    expect(
      earnedBadgeIds({
        ...nothing,
        modesPlayed: ["choice", "match", "typing", "truefalse"],
      })
    ).toContain("all-modes")
  })

  /* The caller diffs against what is already stored, so this returning
     everything currently true — not only what is newly true — is the contract. */
  it("reports every qualifying badge, not just the newest", () => {
    expect(
      earnedBadgeIds({
        totalQuizzes: 10,
        totalCorrect: 200,
        bestStreak: 12,
        dailyStreak: 8,
        modesPlayed: ["choice", "match", "typing", "truefalse"],
        hadPerfectSession: true,
      })
    ).toHaveLength(BADGES.length)
  })
})
