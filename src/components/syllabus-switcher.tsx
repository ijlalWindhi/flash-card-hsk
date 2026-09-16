import { Link, useRouterState } from "@tanstack/react-router"
import {
  SYLLABUS_LIST,
  syllabusFromPath,
  syllabusPath,
} from "@/features/vocabulary/syllabus"
import { cn } from "@/lib/utils"

/**
 * Picks which HSK syllabus the app studies.
 *
 * Real links, not a toggle that flips client state: the choice *is* the URL, so
 * it survives a refresh, can be bookmarked and shared, and lets the browser's
 * back button undo it.
 *
 * Every option points at its syllabus' word list rather than at the current
 * page's equivalent. Switching syllabus abandons any deck in progress — the
 * words are different — so landing on the list is where the learner has to go
 * next anyway, and it never leads to an empty session screen.
 */
export function SyllabusSwitcher() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const active = syllabusFromPath(pathname)

  return (
    <div className="flex items-center gap-1.5">
      <span className="hidden text-muted-foreground sm:inline">HSK</span>
      <div
        role="group"
        aria-label="Pilih silabus HSK"
        className="flex items-center border border-border"
      >
        {SYLLABUS_LIST.map((syllabus) => {
          const current = syllabus.id === active.id
          return (
            <Link
              key={syllabus.id}
              to={syllabusPath(syllabus)}
              aria-current={current ? "page" : undefined}
              title={`${syllabus.name} — ${syllabus.tagline}`}
              className={cn(
                "px-2 py-0.5 tabular-nums no-underline transition-colors",
                current
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {syllabus.short}
            </Link>
          )
        })}
      </div>
      <span className="hidden text-muted-foreground sm:inline">
        · tingkat 4
      </span>
    </div>
  )
}
