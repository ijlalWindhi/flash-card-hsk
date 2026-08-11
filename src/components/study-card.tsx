import { formatSenses } from "@/components/vocabulary-card"
import type { VocabularyItem } from "@/features/vocabulary/types"

/**
 * The flashcard itself: the one place the design spends its boldness.
 *
 * Face down it shows nothing but the Hanzi, so recall is not spoiled by a
 * glimpse of the answer. It is a real `<button>`, which is what makes click,
 * Enter and Space all work without a keydown handler.
 */
export function StudyCard({
  card,
  revealed,
  onFlip,
}: {
  card: VocabularyItem
  revealed: boolean
  onFlip: () => void
}) {
  return (
    <button
      type="button"
      aria-label="Flashcard"
      aria-expanded={revealed}
      onClick={onFlip}
      className="flex min-h-[22rem] w-full flex-col items-center justify-center gap-6 border-2 border-foreground bg-card px-6 py-12 text-center"
    >
      <span className="hanzi text-6xl sm:text-7xl">{card.hanzi}</span>

      {revealed ? (
        <span data-testid="study-reveal" className="grid gap-2">
          <span className="text-base text-muted-foreground">{card.pinyin}</span>
          <span className="text-lg font-medium">
            {formatSenses(card.translationId)}
          </span>
          <span className="text-sm text-muted-foreground">
            {formatSenses(card.translationEn)}
          </span>
        </span>
      ) : (
        <span className="eyebrow text-muted-foreground">
          Ketuk untuk melihat arti
        </span>
      )}
    </button>
  )
}
