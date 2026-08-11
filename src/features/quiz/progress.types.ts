import type { Badge } from "./badges"

/**
 * The shapes that cross the wire, kept out of `progress.server.ts`.
 *
 * That module imports the Firebase Admin SDK. Type-only imports are erased, but
 * a component importing types from it is one careless edit away from importing
 * a value too — and that failure shows up as a broken browser bundle rather
 * than a type error. Declaring them here removes the temptation.
 */
export type ProgressSummary = {
  totalQuizzes: number
  totalAnswered: number
  totalCorrect: number
  bestStreak: number
  dailyStreak: number
  answeredToday: number
  badges: Array<Badge>
}

export type RecordedResult = {
  dailyStreak: number
  answeredToday: number
  newBadges: Array<Badge>
}
