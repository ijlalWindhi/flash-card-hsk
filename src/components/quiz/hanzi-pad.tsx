import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

type Point = { x: number; y: number }
type Stroke = Array<Point>

/** Ink width in CSS pixels — heavy enough to read as brush strokes at card size. */
const LINE_WIDTH = 7

/**
 * A square pad for writing one character by hand.
 *
 * Knows nothing about quizzes: it collects ink and hands back nothing, because
 * no caller has any use for the drawing. That keeps it reusable anywhere a
 * learner might want to practise a stroke order.
 *
 * Strokes live in a ref and are painted straight from the pointer handler, so
 * moving a finger never re-renders React — only lifting it does, and only to
 * light up the two buttons. Keeping the points as data is also what makes undo
 * and a crisp redraw after a resize possible at all; a canvas alone remembers
 * nothing but pixels.
 */
export function HanziPad({ label = "Area menulis hanzi" }: { label?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const strokes = useRef<Array<Stroke>>([])
  const active = useRef<Stroke | null>(null)
  const [count, setCount] = useState(0)

  /** Applies the ink settings a fresh backing store loses on every resize. */
  const prepare = useCallback((context: CanvasRenderingContext2D) => {
    const ratio = window.devicePixelRatio || 1
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.lineWidth = LINE_WIDTH
    context.lineCap = "round"
    context.lineJoin = "round"
    // Read from the element so the ink follows the theme's foreground colour
    // rather than pinning a hex that would be invisible on a dark ground.
    context.strokeStyle = getComputedStyle(context.canvas).color
  }, [])

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context) return

    // Cleared in device pixels, drawn in CSS pixels: the identity transform is
    // what makes `canvas.width` the right number to wipe.
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, canvas.width, canvas.height)
    prepare(context)

    for (const stroke of strokes.current) {
      for (let i = 1; i < stroke.length; i += 1) {
        segment(context, stroke[i - 1], stroke[i])
      }
      // A tap is a stroke of one point, and a line to itself is the dot it
      // should leave behind.
      if (stroke.length === 1) segment(context, stroke[0], stroke[0])
    }
  }, [prepare])

  // The backing store is sized in device pixels, the canvas in CSS pixels; a
  // canvas left at its default 300×150 would stretch the ink and blur it.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // An arrow function rather than a declaration: a hoisted `function resize`
    // could in principle run before the guard above, so TypeScript drops the
    // narrowing on `canvas` inside one.
    const resize = () => {
      const ratio = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      const width = Math.round(rect.width * ratio)
      const height = Math.round(rect.height * ratio)
      if (width === 0 || (canvas.width === width && canvas.height === height)) {
        return
      }

      canvas.width = width
      canvas.height = height
      redraw()
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [redraw])

  function begin(event: React.PointerEvent<HTMLCanvasElement>) {
    // Only the primary button draws; a right-click should open the menu.
    if (event.pointerType === "mouse" && event.button !== 0) return

    const context = event.currentTarget.getContext("2d")
    if (!context) return

    // Capture keeps a stroke that wanders past the edge attached to this canvas,
    // so the pen lifts where the learner lifted it rather than at the border.
    event.currentTarget.setPointerCapture(event.pointerId)
    prepare(context)

    const point = positionOf(event)
    active.current = [point]
    segment(context, point, point)
  }

  function extend(event: React.PointerEvent<HTMLCanvasElement>) {
    const stroke = active.current
    const context = event.currentTarget.getContext("2d")
    if (!stroke || !context) return

    const point = positionOf(event)
    segment(context, stroke[stroke.length - 1], point)
    stroke.push(point)
  }

  function end() {
    const stroke = active.current
    if (!stroke) return

    active.current = null
    strokes.current = [...strokes.current, stroke]
    setCount(strokes.current.length)
  }

  function undo() {
    strokes.current = strokes.current.slice(0, -1)
    setCount(strokes.current.length)
    redraw()
  }

  function clear() {
    strokes.current = []
    active.current = null
    setCount(0)
    redraw()
  }

  return (
    <div>
      <div className="relative mx-auto aspect-square w-full max-w-[17rem] border-2 border-foreground bg-card">
        {/* The 米字格 of a Chinese practice book: guides for proportion, drawn
            behind the ink so clearing the pad never takes them with it. */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full text-border"
        >
          <g stroke="currentColor" strokeWidth="0.6" strokeDasharray="4 4">
            <line x1="50" y1="0" x2="50" y2="100" />
            <line x1="0" y1="50" x2="100" y2="50" />
            <line x1="0" y1="0" x2="100" y2="100" />
            <line x1="100" y1="0" x2="0" y2="100" />
          </g>
        </svg>

        <canvas
          ref={canvasRef}
          role="img"
          aria-label={label}
          data-testid="hanzi-pad"
          onPointerDown={begin}
          onPointerMove={extend}
          onPointerUp={end}
          onPointerCancel={end}
          // `touch-none` is what stops a stroke from scrolling the page instead
          // of drawing — without it the pad is unusable on a phone.
          className="absolute inset-0 h-full w-full cursor-crosshair touch-none text-foreground"
        />
      </div>

      <div className="mx-auto mt-2 flex w-full max-w-[17rem] items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Tidak dinilai</p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={count === 0}
          >
            Undo
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clear}
            disabled={count === 0}
          >
            Hapus
          </Button>
        </div>
      </div>
    </div>
  )
}

function segment(
  context: CanvasRenderingContext2D,
  from: Point,
  to: Point
): void {
  context.beginPath()
  context.moveTo(from.x, from.y)
  context.lineTo(to.x, to.y)
  context.stroke()
}

/** Pointer position in CSS pixels relative to the canvas's top-left corner. */
function positionOf(event: React.PointerEvent<HTMLCanvasElement>): Point {
  const rect = event.currentTarget.getBoundingClientRect()
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}
