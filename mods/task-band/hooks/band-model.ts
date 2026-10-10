import type { BandTask } from '../types'

// Stage steps out of four; status `review` is the fourth.
const STAGE_STEPS: Readonly<Record<string, number>> = {
  implementing: 1,
  'agent-review': 2,
  verified: 3,
}
export const STAGE_COUNT = 4

export type ParsedNote = {
  status: string | null
  stage: string | null
  priority: number | null
  done: number
  total: number
}

const unquote = (value: string): string => {
  const isQuoted = /^(["']).*\1$/.test(value)
  return isQuoted ? value.slice(1, -1) : value
}

// Reads the frontmatter fields the band needs and counts the task boxes in
// the body. Boxes inside fenced code blocks are examples, not criteria.
export const parseNote = (text: string): ParsedNote => {
  const lines = text.split(/\r?\n/)
  const fields: Record<string, string> = {}
  let index = 0

  if (lines[0]?.trim() === '---') {
    for (index = 1; index < lines.length; index++) {
      const line = lines[index] ?? ''
      if (line.trim() === '---') {
        index++
        break
      }
      const field = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line)
      if (field) fields[field[1]!] = unquote(field[2]!.trim())
    }
  }

  let done = 0
  let total = 0
  let fence: { char: string; length: number } | null = null

  for (; index < lines.length; index++) {
    const line = lines[index] ?? ''
    const fenceMark = /^\s*(`{3,}|~{3,})/.exec(line)
    if (fenceMark) {
      const mark = fenceMark[1]!
      if (fence === null) {
        fence = { char: mark[0]!, length: mark.length }
      } else if (mark[0] === fence.char && mark.length >= fence.length) {
        fence = null
      }
      continue
    }
    if (fence !== null) continue

    const box = /^\s*(?:[-*+]|\d+[.)])\s+\[([ xX~])\]/.exec(line)
    if (!box) continue
    total++
    if (box[1] === 'x' || box[1] === 'X') done++
  }

  const priority = fields.priority === undefined ? NaN : Number(fields.priority)

  return {
    status: fields.status ?? null,
    stage: fields.stage || null,
    priority: Number.isFinite(priority) ? priority : null,
    done,
    total,
  }
}

export const stageStep = (task: BandTask): number =>
  task.status === 'review' ? STAGE_COUNT : (STAGE_STEPS[task.stage ?? ''] ?? 0)

export const pillText = (task: BandTask): string => {
  const label = task.status === 'review' ? 'review' : (task.stage ?? 'doing')
  return `[${label} ${stageStep(task)}/${STAGE_COUNT}]`
}

// Criteria when the note has boxes, the stage otherwise.
export const progress = (task: BandTask): number =>
  task.total > 0 ? task.done / task.total : stageStep(task) / STAGE_COUNT

export const countText = (task: BandTask): string => {
  const percent = `${Math.round(progress(task) * 100)}%`
  return task.total > 0 ? `${task.done}/${task.total} ${percent}` : percent
}

export type RunKind = 'fill' | 'empty' | 'tick-fill' | 'tick-empty' | 'pill'
export type Run = { kind: RunKind; text: string }

// The bar as runs of one style each: filled cells, empty cells, a tick at
// every box boundary (when each box gets at least two cells), and the stage
// pill laid over the middle.
export const barRuns = (task: BandTask, width: number): Run[] => {
  const pill = pillText(task)
  if (width <= pill.length) return [{ kind: 'pill', text: pill }]

  const filled = Math.round(progress(task) * width)
  const cells: { kind: RunKind; char: string }[] = []
  for (let cell = 0; cell < width; cell++) {
    cells.push(cell < filled ? { kind: 'fill', char: '█' } : { kind: 'empty', char: '░' })
  }

  if (task.total > 1 && width / task.total >= 2) {
    for (let box = 1; box < task.total; box++) {
      const at = Math.round((box * width) / task.total)
      const cell = cells[at]
      if (cell) cells[at] = { kind: at < filled ? 'tick-fill' : 'tick-empty', char: '│' }
    }
  }

  const start = Math.floor((width - pill.length) / 2)
  for (let offset = 0; offset < pill.length; offset++) {
    cells[start + offset] = { kind: 'pill', char: pill[offset]! }
  }

  const runs: Run[] = []
  for (const cell of cells) {
    const last = runs[runs.length - 1]
    if (last && last.kind === cell.kind) last.text += cell.char
    else runs.push({ kind: cell.kind, text: cell.char })
  }
  return runs
}

export const truncate = (text: string, width: number): string =>
  text.length <= width ? text : `${text.slice(0, Math.max(0, width - 1))}…`

export const byPriority = (a: BandTask, b: BandTask): number => {
  const pa = a.priority ?? Number.MAX_SAFE_INTEGER
  const pb = b.priority ?? Number.MAX_SAFE_INTEGER
  if (pa !== pb) return pa - pb
  if (a.status !== b.status) return a.status === 'doing' ? -1 : 1
  return a.id.localeCompare(b.id)
}

export type RowLayout = { titleWidth: number; barWidth: number; countWidth: number }

// Row: "● " title "  " bar "  " count "  " ✕ — the title gets up to a third
// of the band, the bar what is left.
export const rowLayout = (tasks: readonly BandTask[], columns: number): RowLayout => {
  const countWidth = Math.max(...tasks.map(task => countText(task).length))
  const longestTitle = Math.max(...tasks.map(task => task.id.length))
  const longestPill = Math.max(...tasks.map(task => pillText(task).length))
  const fixed = 2 + 2 + 2 + countWidth + 2 + 1
  const wantedTitle = Math.max(10, Math.min(longestTitle, 40, Math.floor(columns / 3)))
  const barWidth = Math.max(longestPill, columns - fixed - wantedTitle)
  // On a narrow band the bar keeps room for its pill and the title gives way.
  const titleWidth = Math.max(4, Math.min(wantedTitle, columns - fixed - barWidth))
  return { titleWidth, barWidth, countWidth }
}
