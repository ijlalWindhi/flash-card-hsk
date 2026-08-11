import { createServerOnlyFn } from "@tanstack/react-start"
import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import type { Firestore } from "firebase-admin/firestore"

/**
 * Collection names in one place.
 *
 * Firestore has no schema to migrate, which means a typo in a collection name
 * silently creates a second, empty collection instead of failing. Naming them
 * once is the closest thing to a compile-time check available here.
 */
export const COLLECTIONS = {
  users: "users",
  quizResults: "quizResults",
  wordStats: "wordStats",
  userBadges: "userBadges",
} as const

function readCredentials() {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY must all be set. Copy .env.example to .env and fill them in."
    )
  }

  return {
    projectId,
    clientEmail,
    // Service-account keys carry real newlines. Environment files and hosting
    // dashboards almost always store them escaped, so accept both forms.
    privateKey: privateKey.replace(/\\n/g, "\n"),
  }
}

let cached: Firestore | undefined

/**
 * The shared Firestore handle.
 *
 * `createServerOnlyFn` makes importing this from a route component a build
 * error rather than a leaked service-account key. The app is initialised on
 * first call, so merely importing the module never reads the environment —
 * which is what lets the browser bundle tree-shake it away.
 */
export const getFirestoreDb = createServerOnlyFn((): Firestore => {
  if (!cached) {
    const credentials = readCredentials()
    // Hot reload re-runs this module while the Firebase app survives, and
    // initializeApp throws on a duplicate name.
    const app =
      getApps()[0] ??
      initializeApp({
        credential: cert(credentials),
        projectId: credentials.projectId,
      })

    cached = getFirestore(app)
    // Firestore rejects `undefined` field values outright; ignoring them lets
    // optional fields be omitted without every writer building a clean object.
    cached.settings({ ignoreUndefinedProperties: true })
  }
  return cached
})

/** True when Firebase is configured at all — guests work fine without it. */
export function isFirestoreConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  )
}
