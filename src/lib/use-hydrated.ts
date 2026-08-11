import { useEffect, useState } from "react"

/**
 * True once React has taken over the server-rendered markup.
 *
 * Forms here submit through server functions, which means their `onSubmit`
 * must call `preventDefault()`. Before hydration that handler does not exist,
 * so a click would trigger a native GET submit and throw away everything the
 * person typed. Gating the submit button on this makes the form honest about
 * when it is ready.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  return hydrated
}
