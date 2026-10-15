import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { getVocabulary } from "./vocabulary.server"

/**
 * Loads one syllabus' words for the public list.
 *
 * Route loaders call this instead of importing the database directly, which is
 * what keeps Turso credentials out of the browser bundle. A syllabus is at most
 * ~1,300 rows, so it is fetched once and filtered client-side rather than
 * round-tripping on every keystroke.
 *
 * The syllabus is validated rather than trusted: this is a public GET whose
 * argument reaches a query, and an unknown id should be a rejected request, not
 * an empty list that looks like a missing seed.
 */
export const getVocabularyFn = createServerFn({ method: "GET" })
  .validator(z.object({ syllabus: z.enum(["3.0", "2.0", "2.0-5"]) }))
  .handler(({ data }) => getVocabulary(data.syllabus))
