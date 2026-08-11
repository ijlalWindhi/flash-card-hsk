import { createServerFn } from "@tanstack/react-start"
import { getVocabulary } from "./vocabulary.server"

/**
 * Loads the whole deck for the public list.
 *
 * Route loaders call this instead of importing the database directly, which is
 * what keeps Turso credentials out of the browser bundle. The list is ~1,000
 * rows, so it is fetched once and filtered client-side rather than round-
 * tripping on every keystroke.
 */
export const getVocabularyFn = createServerFn({ method: "GET" }).handler(
  getVocabulary
)
