import { memo } from "react"
import { formatSenses } from "@/features/vocabulary/format"
import type { VocabularyItem } from "@/features/vocabulary/types"

/**
 * One selectable word.
 *
 * Reading order is Hanzi, pinyin, Indonesian, then a quieter English
 * confirmation line. The checkbox carries an explicit accessible name so it
 * reads as "安排 ānpái" rather than the whole tile.
 *
 * A native checkbox rather than the Radix one: the deck renders hundreds of
 * these at a time, and a plain input costs nothing to hydrate.
 */
export const VocabularyCard = memo(function VocabularyCard({
  item,
  selected,
  onToggle,
}: {
  item: VocabularyItem
  selected: boolean
  onToggle: (id: string) => void
}) {
  const checkboxId = `pick-${item.id}`

  return (
    <li
      className={`border bg-card transition-colors ${
        selected ? "border-foreground" : "border-border hover:border-input"
      }`}
    >
      <div className="flex h-full items-start gap-3 p-4">
        <input
          type="checkbox"
          id={checkboxId}
          aria-label={`${item.hanzi} ${item.pinyin}`}
          checked={selected}
          onChange={() => onToggle(item.id)}
          className="mt-1 size-4 shrink-0 cursor-pointer accent-foreground"
        />
        <label htmlFor={checkboxId} className="min-w-0 flex-1 cursor-pointer">
          <span className="hanzi block text-3xl">{item.hanzi}</span>
          <span className="mt-1.5 block text-sm text-muted-foreground">
            {item.pinyin}
          </span>
          <span className="mt-2 block text-sm font-medium">
            {formatSenses(item.translationId)}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {formatSenses(item.translationEn)}
          </span>
        </label>
      </div>
    </li>
  )
})
