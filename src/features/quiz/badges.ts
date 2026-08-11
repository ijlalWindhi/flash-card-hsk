import type { QuizMode } from "./types"

export type Badge = {
  id: string
  name: string
  description: string
}

/**
 * Every badge, defined once as data.
 *
 * Definitions live in code rather than the database: they are part of the
 * product, not per-learner state. Firestore stores only *which* badges someone
 * has earned, so wording can be corrected without a migration, and a badge can
 * be added without backfilling anything.
 *
 * Ids are permanent. Renaming one orphans it for everybody who earned it.
 */
export const BADGES: Array<Badge> = [
  {
    id: "first-quiz",
    name: "Langkah pertama",
    description: "Menyelesaikan quiz pertamamu.",
  },
  {
    id: "flawless",
    name: "Tanpa cela",
    description: "Satu sesi penuh tanpa satu pun jawaban salah.",
  },
  {
    id: "streak-10",
    name: "Sepuluh beruntun",
    description: "Sepuluh jawaban benar berturut-turut dalam satu sesi.",
  },
  {
    id: "correct-100",
    name: "Seratus benar",
    description: "Seratus jawaban benar terkumpul.",
  },
  {
    id: "all-modes",
    name: "Serba bisa",
    description: "Mencoba keempat mode quiz.",
  },
  {
    id: "daily-7",
    name: "Sepekan penuh",
    description: "Tujuh hari berturut-turut mengerjakan quiz.",
  },
]

export const BADGES_BY_ID = new Map(BADGES.map((badge) => [badge.id, badge]))

/** Everything the rules need, gathered once so evaluation stays pure. */
export type BadgeContext = {
  totalQuizzes: number
  totalCorrect: number
  bestStreak: number
  dailyStreak: number
  modesPlayed: Array<QuizMode>
  hadPerfectSession: boolean
}

/**
 * Which badges the learner now qualifies for.
 *
 * Returns everything currently true, not only what is newly true — the caller
 * knows what was already stored and works out the difference. That keeps this
 * function a plain rule table with no memory of its own.
 */
export function earnedBadgeIds(context: BadgeContext): Array<string> {
  const earned: Array<string> = []

  if (context.totalQuizzes >= 1) earned.push("first-quiz")
  if (context.hadPerfectSession) earned.push("flawless")
  if (context.bestStreak >= 10) earned.push("streak-10")
  if (context.totalCorrect >= 100) earned.push("correct-100")
  if (new Set(context.modesPlayed).size >= 4) earned.push("all-modes")
  if (context.dailyStreak >= 7) earned.push("daily-7")

  return earned
}
