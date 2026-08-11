import { FieldValue } from "firebase-admin/firestore"
import { COLLECTIONS, getFirestoreDb } from "@/db/firestore.server"
import { BADGES_BY_ID, earnedBadgeIds } from "./badges"
import { dailyStreak } from "./streak"
import type { Badge } from "./badges"
import type { ProgressSummary, RecordedResult } from "./progress.types"
import type { QuizResultInput } from "./quiz.schemas"
import type { QuizMode } from "./types"

/**
 * Per-learner aggregate, kept beside the individual results.
 *
 * Badges and streaks need totals over every session ever played. Recomputing
 * those by scanning `quizResults` would cost a read per past session on every
 * submission — a bill that grows with how diligent the learner is. One rolled-up
 * document keeps recording a result at a fixed cost.
 *
 * It holds no derived streak, only the days that produced it: a stored counter
 * can drift out of step with the facts, a stored set of days cannot.
 */
const PROGRESS_COLLECTION = "userProgress"

/** Roughly a year of history; enough for any streak anyone will actually run. */
const MAX_TRACKED_DAYS = 400

/** A ceiling on the review query, sorted in memory to avoid a composite index. */
const REVIEW_SCAN_LIMIT = 500

type ProgressDocument = {
  totalQuizzes: number
  totalAnswered: number
  totalCorrect: number
  bestStreak: number
  hadPerfectSession: boolean
  modesPlayed: Array<QuizMode>
  dayCounts: Record<string, number>
  badgeIds: Array<string>
}

const EMPTY: ProgressDocument = {
  totalQuizzes: 0,
  totalAnswered: 0,
  totalCorrect: 0,
  bestStreak: 0,
  hadPerfectSession: false,
  modesPlayed: [],
  dayCounts: {},
  badgeIds: [],
}

function readProgress(data: FirebaseFirestore.DocumentData | undefined) {
  if (!data) return EMPTY
  return {
    totalQuizzes: Number(data.totalQuizzes ?? 0),
    totalAnswered: Number(data.totalAnswered ?? 0),
    totalCorrect: Number(data.totalCorrect ?? 0),
    bestStreak: Number(data.bestStreak ?? 0),
    hadPerfectSession: Boolean(data.hadPerfectSession),
    modesPlayed: (data.modesPlayed ?? []) as Array<QuizMode>,
    dayCounts: (data.dayCounts ?? {}) as Record<string, number>,
    badgeIds: (data.badgeIds ?? []) as Array<string>,
  }
}

/** Keeps the newest days and drops the rest, so the map cannot grow forever. */
function prune(dayCounts: Record<string, number>): Record<string, number> {
  const keys = Object.keys(dayCounts).sort().slice(-MAX_TRACKED_DAYS)
  return Object.fromEntries(keys.map((key) => [key, dayCounts[key]]))
}

/** Composite id, with a separator no username or word id can contain. */
function wordStatId(userId: string, wordId: string): string {
  return `${userId}:${wordId}`
}

/**
 * Records one finished quiz.
 *
 * Three writes, none of which depends on reading the others: the session row is
 * appended, per-word counters are incremented in a batch, and the aggregate is
 * updated in a transaction because badges depend on its previous value.
 */
export async function recordQuizResult(
  userId: string,
  result: QuizResultInput
): Promise<RecordedResult> {
  const db = getFirestoreDb()
  const correct = result.words.filter((word) => word.correct).length
  const answered = result.words.length

  // The same word can appear more than once in a matching board, so fold the
  // attempts together before writing rather than issuing two writes for one id.
  const perWord = new Map<
    string,
    { hanzi: string; right: number; wrong: number }
  >()
  for (const word of result.words) {
    const entry = perWord.get(word.wordId) ?? {
      hanzi: word.hanzi,
      right: 0,
      wrong: 0,
    }
    if (word.correct) entry.right += 1
    else entry.wrong += 1
    perWord.set(word.wordId, entry)
  }

  const batch = db.batch()
  batch.create(db.collection(COLLECTIONS.quizResults).doc(), {
    userId,
    mode: result.mode,
    source: result.source,
    total: answered,
    correct,
    bestStreak: result.bestStreak,
    dayKey: result.dayKey,
    completedAt: new Date(),
  })

  for (const [wordId, entry] of perWord) {
    batch.set(
      db.collection(COLLECTIONS.wordStats).doc(wordStatId(userId, wordId)),
      {
        userId,
        vocabularyId: wordId,
        hanzi: entry.hanzi,
        correctCount: FieldValue.increment(entry.right),
        wrongCount: FieldValue.increment(entry.wrong),
        lastSeenAt: new Date(),
      },
      { merge: true }
    )
  }
  await batch.commit()

  const progressRef = db.collection(PROGRESS_COLLECTION).doc(userId)
  const outcome = await db.runTransaction(async (transaction) => {
    const previous = readProgress((await transaction.get(progressRef)).data())

    const dayCounts = prune({
      ...previous.dayCounts,
      [result.dayKey]: (previous.dayCounts[result.dayKey] ?? 0) + answered,
    })
    const modesPlayed = [...new Set([...previous.modesPlayed, result.mode])]
    const streak = dailyStreak(Object.keys(dayCounts), result.dayKey)

    const next: ProgressDocument = {
      totalQuizzes: previous.totalQuizzes + 1,
      totalAnswered: previous.totalAnswered + answered,
      totalCorrect: previous.totalCorrect + correct,
      bestStreak: Math.max(previous.bestStreak, result.bestStreak),
      hadPerfectSession:
        previous.hadPerfectSession || (answered > 0 && correct === answered),
      modesPlayed,
      dayCounts,
      badgeIds: previous.badgeIds,
    }

    const qualified = earnedBadgeIds({
      totalQuizzes: next.totalQuizzes,
      totalCorrect: next.totalCorrect,
      bestStreak: next.bestStreak,
      dailyStreak: streak,
      modesPlayed: next.modesPlayed,
      hadPerfectSession: next.hadPerfectSession,
    })
    const fresh = qualified.filter((id) => !previous.badgeIds.includes(id))
    next.badgeIds = [...previous.badgeIds, ...fresh]

    transaction.set(progressRef, { ...next, updatedAt: new Date() })

    return {
      dailyStreak: streak,
      answeredToday: dayCounts[result.dayKey],
      freshBadgeIds: fresh,
    }
  })

  // Written outside the transaction on purpose: these documents exist so a
  // badge can be listed with the date it was earned, and losing that timestamp
  // to a retry is not worth making the transaction any larger.
  if (outcome.freshBadgeIds.length > 0) {
    const badgeBatch = db.batch()
    for (const badgeId of outcome.freshBadgeIds) {
      badgeBatch.set(
        db.collection(COLLECTIONS.userBadges).doc(`${userId}:${badgeId}`),
        { userId, badgeId, earnedAt: new Date() }
      )
    }
    await badgeBatch.commit()
  }

  return {
    dailyStreak: outcome.dailyStreak,
    answeredToday: outcome.answeredToday,
    newBadges: outcome.freshBadgeIds
      .map((id) => BADGES_BY_ID.get(id))
      .filter((badge): badge is Badge => badge !== undefined),
  }
}

export async function getProgressSummary(
  userId: string,
  today: string
): Promise<ProgressSummary> {
  const snapshot = await getFirestoreDb()
    .collection(PROGRESS_COLLECTION)
    .doc(userId)
    .get()
  const progress = readProgress(snapshot.data())

  return {
    totalQuizzes: progress.totalQuizzes,
    totalAnswered: progress.totalAnswered,
    totalCorrect: progress.totalCorrect,
    bestStreak: progress.bestStreak,
    dailyStreak: dailyStreak(Object.keys(progress.dayCounts), today),
    answeredToday: progress.dayCounts[today] ?? 0,
    badges: progress.badgeIds
      .map((id) => BADGES_BY_ID.get(id))
      .filter((badge): badge is Badge => badge !== undefined),
  }
}

/**
 * The word ids this learner gets wrong most often.
 *
 * Queried on `userId` alone and ranked in memory. Asking Firestore to sort by
 * `wrongCount` as well would need a composite index deployed before the feature
 * worked at all; a few hundred documents sort instantly here.
 */
export async function getReviewWordIds(
  userId: string,
  limit: number
): Promise<Array<string>> {
  const snapshot = await getFirestoreDb()
    .collection(COLLECTIONS.wordStats)
    .where("userId", "==", userId)
    .limit(REVIEW_SCAN_LIMIT)
    .get()

  return snapshot.docs
    .map((doc) => doc.data())
    .filter((data) => Number(data.wrongCount ?? 0) > 0)
    .sort((a, b) => {
      const byWrong = Number(b.wrongCount) - Number(a.wrongCount)
      if (byWrong !== 0) return byWrong
      // A word missed as often but seen less recently is the staler memory.
      return (
        (a.lastSeenAt?.toMillis?.() ?? 0) - (b.lastSeenAt?.toMillis?.() ?? 0)
      )
    })
    .slice(0, limit)
    .map((data) => String(data.vocabularyId))
}
