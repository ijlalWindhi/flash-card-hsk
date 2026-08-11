import { describe, expect, it } from "vitest"
import { dailyStreak, dayKey } from "./streak"

describe("dayKey", () => {
  it("formats the local calendar date, zero padded", () => {
    expect(dayKey(new Date(2026, 7, 5, 23, 59))).toBe("2026-08-05")
    expect(dayKey(new Date(2026, 11, 31, 0, 1))).toBe("2026-12-31")
  })
})

describe("dailyStreak", () => {
  it("counts back through consecutive days", () => {
    expect(
      dailyStreak(["2026-08-11", "2026-08-10", "2026-08-09"], "2026-08-11")
    ).toBe(3)
  })

  /* Not having studied yet today is not a broken streak — the day is not over.
     Counting it as broken would punish someone who opens the app in the
     morning before doing anything. */
  it("keeps yesterday's run alive when today is still empty", () => {
    expect(dailyStreak(["2026-08-10", "2026-08-09"], "2026-08-11")).toBe(2)
  })

  it("ends the streak after a full missed day", () => {
    expect(dailyStreak(["2026-08-09", "2026-08-08"], "2026-08-11")).toBe(0)
  })

  it("counts a single day", () => {
    expect(dailyStreak(["2026-08-11"], "2026-08-11")).toBe(1)
  })

  it("is zero with no history", () => {
    expect(dailyStreak([], "2026-08-11")).toBe(0)
  })

  it("crosses a month boundary", () => {
    expect(
      dailyStreak(["2026-08-01", "2026-07-31", "2026-07-30"], "2026-08-01")
    ).toBe(3)
  })

  it("crosses a year boundary", () => {
    expect(dailyStreak(["2027-01-01", "2026-12-31"], "2027-01-01")).toBe(2)
  })

  it("ignores days after today rather than counting them", () => {
    expect(dailyStreak(["2026-08-20", "2026-08-11"], "2026-08-11")).toBe(1)
  })
})
