import type { VocabularyItem } from "@/features/vocabulary/types"

export type StudySession = {
  cards: Array<VocabularyItem>
  source: "selected" | "random"
}

/**
 * Where a pending session lives between the list and the study page.
 *
 * Session storage, not the URL or the database: a deck is per-tab and
 * disposable, and a thousand IDs do not belong in a query string.
 */
export const STUDY_SESSION_KEY = "hsk4-study-session"

export function storeStudySession(session: StudySession): void {
  sessionStorage.setItem(STUDY_SESSION_KEY, JSON.stringify(session))
}

/** Returns null for a missing, malformed or empty payload — never throws. */
export function readStudySession(): StudySession | null {
  const raw = sessionStorage.getItem(STUDY_SESSION_KEY)
  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isStudySession(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

function isStudySession(value: unknown): value is StudySession {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Partial<StudySession>
  return (
    Array.isArray(candidate.cards) &&
    candidate.cards.length > 0 &&
    candidate.cards.every(
      (card) => typeof card?.id === "string" && typeof card?.hanzi === "string"
    ) &&
    (candidate.source === "selected" || candidate.source === "random")
  )
}

/** Shuffles a copy in place using the injected source of randomness. */
function shuffle(
  items: Array<VocabularyItem>,
  random: () => number
): Array<VocabularyItem> {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Builds the deck for one study run.
 *
 * An explicit selection always wins: the learner picked those words, so they
 * are studied in the list's own sorted order and `randomCount` is ignored.
 * With nothing selected, `randomCount` words are sampled without replacement.
 *
 * `random` is a parameter so sampling is testable; callers pass `Math.random`.
 *
 * @throws RangeError when nothing is selected and `randomCount` is not a whole
 * number between 1 and `items.length`.
 */
export function createStudySession(
  items: Array<VocabularyItem>,
  selectedIds: Array<string>,
  randomCount: number | null,
  random: () => number
): StudySession {
  if (selectedIds.length > 0) {
    const selected = new Set(selectedIds)
    return {
      cards: items.filter((item) => selected.has(item.id)),
      source: "selected",
    }
  }

  if (
    randomCount === null ||
    !Number.isInteger(randomCount) ||
    randomCount < 1 ||
    randomCount > items.length
  ) {
    throw new RangeError(`Jumlah kartu harus antara 1 dan ${items.length}.`)
  }

  return {
    cards: shuffle(items, random).slice(0, randomCount),
    source: "random",
  }
}
