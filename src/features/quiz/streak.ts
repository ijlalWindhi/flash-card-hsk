/**
 * A calendar day as `YYYY-MM-DD`, in whatever timezone the `Date` is in.
 *
 * Day keys are computed in the browser and sent with the result, so a learner's
 * own midnight decides when a day ends. Deriving them on the server would put
 * someone in Jakarta on a UTC calendar and break their streak at 07:00.
 */
export function dayKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function previousDay(key: string): string {
  const [year, month, day] = key.split("-").map(Number)
  // Month is zero-based on the way in, and rolling past day 1 is handled by
  // Date itself — no need to know how long the previous month was.
  return dayKey(new Date(year, month - 1, day - 1))
}

/**
 * Consecutive days ending today, counting back through the days quizzed.
 *
 * Today counts when it is present, but its absence does not end the streak:
 * a learner who has not studied *yet today* still has yesterday's run intact
 * until the day is over. A gap of a full day ends it.
 */
export function dailyStreak(quizDays: Iterable<string>, today: string): number {
  const days = new Set(quizDays)
  if (days.size === 0) return 0

  let cursor = days.has(today) ? today : previousDay(today)
  let streak = 0

  while (days.has(cursor)) {
    streak += 1
    cursor = previousDay(cursor)
  }

  return streak
}
