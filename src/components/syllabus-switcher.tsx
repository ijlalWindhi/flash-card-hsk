import { Link, useRouterState } from "@tanstack/react-router"
import {
  SYLLABUS_LIST,
  levelsOf,
  syllabusFromPath,
  syllabusPath,
} from "@/features/vocabulary/syllabus"
import type { Syllabus } from "@/features/vocabulary/syllabus"
import { cn } from "@/lib/utils"

/**
 * Picks which HSK syllabus — and, where it offers more than one, which level —
 * the app studies.
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
  const levels = levelsOf(active)

  return (
    <div className="flex items-center gap-1.5">
      <span className="hidden text-muted-foreground sm:inline">HSK</span>
      <div
        role="group"
        aria-label="Pilih silabus HSK"
        className="flex items-center border border-border"
      >
        {SYLLABUS_LIST.map((syllabus) => (
          <Option
            key={syllabus.id}
            to={syllabus}
            current={syllabus.sourceVersion === active.sourceVersion}
            title={`${syllabus.name} — ${syllabus.tagline}`}
          >
            {syllabus.short}
          </Option>
        ))}
      </div>
      <span className="hidden text-muted-foreground sm:inline">· tingkat</span>
      {levels.length > 1 ? (
        <div
          role="group"
          aria-label="Pilih tingkat HSK"
          className="flex items-center border border-border"
        >
          {levels.map((level) => (
            <Option
              key={level.id}
              to={level}
              current={level.id === active.id}
              title={`${level.name} tingkat ${level.level}`}
              ariaLabel={`Tingkat ${level.level}`}
            >
              {level.level}
            </Option>
          ))}
        </div>
      ) : (
        <span className="hidden text-muted-foreground sm:inline">
          {active.level}
        </span>
      )}
    </div>
  )
}

function Option({
  to,
  current,
  title,
  ariaLabel,
  children,
}: {
  to: Syllabus
  current: boolean
  title: string
  ariaLabel?: string
  children: React.ReactNode
}) {
  return (
    <Link
      to={syllabusPath(to)}
      aria-current={current ? "page" : undefined}
      aria-label={ariaLabel}
      title={title}
      className={cn(
        "px-2 py-0.5 tabular-nums no-underline transition-colors",
        current
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </Link>
  )
}
