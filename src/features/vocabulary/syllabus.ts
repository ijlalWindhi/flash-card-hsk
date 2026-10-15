/**
 * The HSK word lists the app can study, and where each one lives. One entry is
 * one syllabus at one level: HSK 2.0 has two, Levels 4 and 5.
 *
 * "Syllabus", not "deck": `QuizDeck` already means a pending set of quiz words,
 * and one page holds both ideas at once.
 *
 * HSK 3.0 keeps the site root. It was the only word list the app had for its
 * whole life so far, so `/`, `/study` and `/quiz` are the indexed URLs and the
 * ones people have linked to; moving them would spend real traffic to buy
 * nothing but symmetry. HSK 2.0 is added beside it under its own prefix, and
its Level 5 under a level segment inside that (`/hsk2/5`).
 */
export type SyllabusId = "3.0" | "2.0" | "2.0-5"

export type Syllabus = {
  id: SyllabusId
  /** Matches `source_version` on every row seeded from this syllabus. */
  sourceVersion: string
  /** Matches `hsk_level`. HSK 2.0 seeds Levels 4 and 5 under one `source_version`. */
  level: number
  /** Route prefix. Empty for 3.0, which lives at the root. */
  prefix: "" | "/hsk2" | "/hsk2/5"
  /** "HSK 3.0" — for prose. Shared by every level of one syllabus. */
  name: string
  /** "3.0" — for the switcher, where "HSK" is already on screen. */
  short: string
  /** Words the syllabus introduces at this level, for copy written before the
   *  loader has run. The rendered count always comes from the data. */
  wordCount: number
  /** One line placing the syllabus for a learner choosing between them. */
  tagline: string
}

export const SYLLABUSES: Record<SyllabusId, Syllabus> = {
  "3.0": {
    id: "3.0",
    sourceVersion: "2025-11",
    level: 4,
    prefix: "",
    name: "HSK 3.0",
    short: "3.0",
    wordCount: 1000,
    tagline: "silabus terbitan terbaru",
  },
  "2.0": {
    id: "2.0",
    sourceVersion: "2012",
    level: 4,
    prefix: "/hsk2",
    name: "HSK 2.0",
    short: "2.0",
    wordCount: 600,
    tagline: "silabus yang masih dipakai mayoritas pusat ujian",
  },
  "2.0-5": {
    id: "2.0-5",
    sourceVersion: "2012",
    level: 5,
    prefix: "/hsk2/5",
    name: "HSK 2.0",
    short: "2.0",
    wordCount: 1300,
    tagline: "silabus yang masih dipakai mayoritas pusat ujian",
  },
}

/** Switcher order, one entry per syllabus at its first level: the default first. */
export const SYLLABUS_LIST: Array<Syllabus> = [
  SYLLABUSES["3.0"],
  SYLLABUSES["2.0"],
]

/** Every level offered for `syllabus`'s syllabus, lowest first. */
export function levelsOf(syllabus: Syllabus): Array<Syllabus> {
  return Object.values(SYLLABUSES)
    .filter((other) => other.sourceVersion === syllabus.sourceVersion)
    .sort((a, b) => a.level - b.level)
}

export const DEFAULT_SYLLABUS: Syllabus = SYLLABUSES["3.0"]

export type SyllabusPage = "list" | "study" | "quiz"

/** Every path a syllabus owns. A literal union, so `<Link to>` stays checked. */
export type SyllabusRoute =
  | "/"
  | "/study"
  | "/quiz"
  | "/hsk2"
  | "/hsk2/study"
  | "/hsk2/quiz"
  | "/hsk2/5"
  | "/hsk2/5/study"
  | "/hsk2/5/quiz"

/**
 * Spelled out rather than concatenated from `prefix`.
 *
 * TanStack checks `to` against the generated route tree, and it can only do
 * that for a literal. A built string would type as `string` and force every
 * call site to cast the check away — which is the check that catches a route
 * added here and never created as a file.
 */
const ROUTES: Record<SyllabusId, Record<SyllabusPage, SyllabusRoute>> = {
  "3.0": { list: "/", study: "/study", quiz: "/quiz" },
  "2.0": { list: "/hsk2", study: "/hsk2/study", quiz: "/hsk2/quiz" },
  "2.0-5": { list: "/hsk2/5", study: "/hsk2/5/study", quiz: "/hsk2/5/quiz" },
}

/** `syllabusPath(SYLLABUSES["2.0"], "study")` → `/hsk2/study`. */
export function syllabusPath(
  syllabus: Syllabus,
  page: SyllabusPage = "list"
): SyllabusRoute {
  return ROUTES[syllabus.id][page]
}

/**
 * Which syllabus a URL belongs to.
 *
 * Anything outside the `/hsk2` subtree — including `/about` and the account
 * pages, which belong to neither — reads as the default, so the switcher always
 * has exactly one option marked current.
 */
export function syllabusFromPath(pathname: string): Syllabus {
  const within = (prefix: string) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  // Innermost prefix first: `/hsk2/5/quiz` is inside `/hsk2` too.
  if (within("/hsk2/5")) return SYLLABUSES["2.0-5"]
  if (within("/hsk2")) return SYLLABUSES["2.0"]
  return SYLLABUSES["3.0"]
}
