import { useDeferredValue, useEffect, useMemo, useState } from "react"
import { EmptyState } from "@/components/empty-state"
import { VocabularyCard } from "@/components/vocabulary-card"
import { Button } from "@/components/ui/button"
import { searchVocabulary } from "@/features/vocabulary/normalize"
import type { VocabularyItem } from "@/features/vocabulary/types"

/** How many tiles to add per "show more". Keeps first paint and hydration cheap. */
const PAGE_SIZE = 60

/**
 * The searchable, selectable deck.
 *
 * All ~1,000 words arrive with the page and are filtered here, so typing never
 * waits on the network. Only a window of matches is rendered: a thousand tiles
 * would cost more to hydrate than anyone reads in one sitting.
 */
export function VocabularyList({
  items,
  selectedIds,
  onToggle,
}: {
  items: Array<VocabularyItem>
  selectedIds: Set<string>
  onToggle: (id: string) => void
}) {
  const [query, setQuery] = useState("")
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const deferredQuery = useDeferredValue(query)

  // Selection and search only work once React has taken over the markup, so the
  // list says when that has happened rather than looking ready too early.
  const [interactive, setInteractive] = useState(false)
  useEffect(() => setInteractive(true), [])

  const results = useMemo(
    () => searchVocabulary(items, deferredQuery),
    [items, deferredQuery]
  )

  const visible = results.slice(0, visibleCount)
  const remaining = results.length - visible.length

  return (
    <section
      className="mt-8"
      data-testid="vocabulary-list"
      data-interactive={interactive}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-foreground pb-2">
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setVisibleCount(PAGE_SIZE)
          }}
          aria-label="Cari hanzi, pinyin, atau arti"
          placeholder="Cari hanzi, pinyin, atau arti…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <p className="eyebrow text-muted-foreground" aria-live="polite">
          {results.length} kata
        </p>
      </div>

      {results.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Tidak ada kata yang cocok"
            description={`Tidak ada hanzi, pinyin, atau arti yang mengandung “${query.trim()}”. Coba kata kunci yang lebih pendek.`}
          />
        </div>
      ) : (
        <>
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((item) => (
              <VocabularyCard
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                onToggle={onToggle}
              />
            ))}
          </ul>

          {remaining > 0 ? (
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={() =>
                  setVisibleCount((current) => current + PAGE_SIZE)
                }
              >
                Tampilkan {Math.min(remaining, PAGE_SIZE)} kata lagi
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
