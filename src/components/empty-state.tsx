import type { ReactNode } from "react"

/**
 * The shared shape for "nothing here" and "something broke".
 *
 * Every state names what happened and offers the one action that resolves it,
 * so a blank region never reads as a successful empty result.
 */
export function EmptyState({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="border border-border bg-card px-6 py-12 text-center">
      {eyebrow ? <p className="eyebrow text-mark">{eyebrow}</p> : null}
      <h2 className="mt-2 text-lg font-medium">{title}</h2>
      <p className="mx-auto mt-2 max-w-prose text-sm text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
