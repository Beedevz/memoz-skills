import type { BandFlag, BandTask } from '../types'

// Stage steps out of four; status `review` is the fourth.
const STAGE_STEPS: Readonly<Record<string, number>> = {
  implementing: 1,
  'agent-review': 2,
  verified: 3,
}
export const STAGE_COUNT = 4

/** The default for `stalledDays` when `.memoz/settings.json` does not hold a usable one. */
export const DEFAULT_STALLED_DAYS = 2

const DAY_MS = 86_400_000

export type ParsedNote = {
  status: string | null
  stage: string | null
  priority: number | null
  /** `[x]` / `[X]`. */
  done: number
  /** `[ ]`. */
  open: number
  /** `[~]`: waived, the reason written next to it. */
  waived: number
  /** The newest dated line under the note's Log heading, `YYYY-MM-DD`. */
  lastLog: string | null
  /** The `start` stamp, when it is a real day. */
  start: string | null
  hasBranch: boolean
  hasMr: boolean
}

// ── frontmatter ──────────────────────────────────────────────────────────

// A note opens with `---`, and the block ends at a line that is only `---` or
// `...`. Without that closing line there is no frontmatter and the whole text
// is the body. (The same pattern as the app's frontmatter reader.)
const FRONTMATTER = /^---[ \t]*\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/

const splitNote = (text: string): { head: string[] | null; body: string } => {
  const match = FRONTMATTER.exec(text)
  if (!match) return { head: null, body: text }
  return { head: (match[1] ?? '').split(/\r?\n/), body: text.slice(match[0].length) }
}

// An indented `- item` line: the items of a block list.
const listItem = (line: string): string | null => {
  const trimmed = line.trimStart()
  if (trimmed.length === line.length) return null
  if (!trimmed.startsWith('- ') && !trimmed.startsWith('-\t')) return null
  return trimmed.slice(2).trim()
}

// One pair of matching quotes goes, and only one (`""x""` -> `"x"`); the value is trimmed before
// and after. The app reads every frontmatter value this way.
const unquote = (value: string): string => {
  const text = value.trim()
  const first = text[0]
  const inner = text.length >= 2 && (first === '"' || first === "'") && text.endsWith(first) ? text.slice(1, -1) : text
  return inner.trim()
}

/** A flow list `[a, b]` is its items; anything else is the one value. */
const parseValue = (raw: string): string | string[] => {
  if (raw.startsWith('[') && raw.endsWith(']')) {
    const inner = raw.slice(1, -1).trim()
    return inner ? inner.split(',').map(part => part.trim()).filter(Boolean) : []
  }
  return raw
}

// ⚠️ A copy of the app's frontmatter reader, not an import (see `lastLogDate`). Its rule, which
// the shared fixture holds the band to:
//  - a line is `key: value` at the first colon; the key is trimmed, so an INDENTED line is a key
//    of its own (`meta:\n  start: x` holds `meta` AND `start`) — nothing is nested;
//  - a LAST row of a key wins (`start:` twice reads the second);
//  - an indented `- item` line under a key is an item of it; the key's value is then the list;
//  - an empty value or list holds nothing.
// Values come back as the list of their non-empty items.
const readData = (head: string[]): Map<string, string | string[]> => {
  const entries: { line: string; items: string[] }[] = []
  for (const line of head) {
    const item = listItem(line)
    const previous = entries[entries.length - 1]
    if (item !== null && previous) previous.items.push(item)
    else entries.push({ line, items: [] })
  }
  const data = new Map<string, string | string[]>()
  for (const { line, items } of entries) {
    const colon = line.indexOf(':')
    if (colon <= 0) continue
    const key = line.slice(0, colon).trim()
    if (key === '') continue
    const raw = line.slice(colon + 1).trim()
    data.set(key, raw === '' && items.length > 0 ? items : parseValue(raw))
  }
  return data
}

// The non-empty items of every value, the way the app's task rows hold the fields.
const readFields = (data: Map<string, string | string[]>): Map<string, string[]> => {
  const fields = new Map<string, string[]>()
  for (const [key, value] of data) {
    fields.set(key, (Array.isArray(value) ? value : [value]).map(item => item.trim()).filter(Boolean))
  }
  return fields
}

// The status exactly as the app's index holds it: a SCALAR (a list is no status), trimmed and
// lower-cased, nothing else — quotes stay (`"doing"` is not `doing`), and `~` / `null` are the
// literal words, not "nothing". An empty value is no status.
const readStatus = (data: Map<string, string | string[]>): string | null => {
  const value = data.get('status')
  if (typeof value !== 'string') return null
  return value.trim().toLowerCase() || null
}

const isEmptyValue = (value: string): boolean => value === '' || value === '~' || value.toLowerCase() === 'null'

/** The first value of a field, one pair of quotes removed; `null` when it carries nothing (`~`, `null`, `""`). */
const scalar = (fields: Map<string, string[]>, key: string): string | null => {
  const first = unquote(fields.get(key)?.[0] ?? '')
  return isEmptyValue(first) ? null : first
}

/** Whether any value of a field carries something (`mr: [~, 7]` does). */
const hasValue = (fields: Map<string, string[]>, key: string): boolean =>
  (fields.get(key) ?? []).some(value => !isEmptyValue(unquote(value)))

// ── days ─────────────────────────────────────────────────────────────────

/** A real calendar day, `YYYY-MM-DD` (`2026-02-30` is not). */
export const isValidDay = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number) as [number, number, number]
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

/** Whole days from `from` to `to`, both `YYYY-MM-DD`; negative when `to` is earlier. */
export const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS)

/** The UTC day of a time in ms. UTC on purpose: it is the clock the Memoz app counts ages on. */
export const utcDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10)

// ── the Log section: the newest dated line ───────────────────────────────

// ⚠️ A copy of the app's reader (`lastLogDate`), not an import: the band is a
// separate repository. The shared fixture (tests/band-fixture.ts) keeps the
// two equal; change one, change the other.
const LINE_BREAK = /[\r\u2028\u2029]/
const LOG_ENTRY = /^\s*(?:[-*+]\s+)?(\d{4}-\d{2}-\d{2})(?!\d)/
const LOG_HEADING = /^logs?\b/i
const isBlank = (char: string | undefined): boolean => char === ' ' || char === '\t'

// The heading is read by hand, not with one regex: two overlapping quantifiers
// back-track badly on a long run of blanks.
const parseHeading = (line: string): { level: number; text: string } | null => {
  let hashEnd = 0
  while (line[hashEnd] === '#') hashEnd++
  if (hashEnd < 1 || hashEnd > 6) return null
  let textStart = hashEnd
  while (isBlank(line[textStart])) textStart++
  const blanks = textStart - hashEnd
  if (blanks === 0) return null
  const text = line.slice(textStart)
  if (text === '') return blanks >= 2 ? { level: hashEnd, text } : null
  return LINE_BREAK.test(text) ? null : { level: hashEnd, text }
}

// The open Log section's level after `line`; null when `line` is no heading.
// 0 = outside a Log section. A deeper heading stays inside it.
const logLevelAfter = (line: string, logLevel: number): number | null => {
  const heading = parseHeading(line)
  if (!heading) return null
  if (logLevel !== 0 && heading.level > logLevel) return logLevel
  return LOG_HEADING.test(heading.text) ? heading.level : 0
}

/** The newest date (the maximum, not the last line) of a dated line inside a `Log` section; fenced code skipped. */
export const lastLogDate = (body: string): string | null => {
  let latest: string | null = null
  let logLevel = 0
  let fence = false
  for (const raw of body.split('\n')) {
    const line = raw.replace(/\r$/, '')
    const isFence = /^\s*(```|~~~)/.test(line)
    if (isFence) fence = !fence
    if (isFence || fence) continue
    const level = logLevelAfter(line, logLevel)
    if (level !== null) {
      logLevel = level
      continue
    }
    if (logLevel === 0) continue
    const day = LOG_ENTRY.exec(line)?.[1]
    if (day !== undefined && isValidDay(day) && (latest === null || day > latest)) latest = day
  }
  return latest
}

// ── the box rule ─────────────────────────────────────────────────────────

// ⚠️ A copy of the app's box counter (`checkboxCounts`), not an import — see
// the note on `lastLogDate`. A box is a list item whose marker is `[ ]`, `[x]`,
// `[X]` or `[~]` (waived); fenced code never counts, nor does indented code, nor
// a numbered item that cannot interrupt a paragraph; blockquoted boxes do.
const CHECKBOX_LINE = /^(\s*(?:>\s*)*(?:[-*+]|\d{1,9}[.)])\s+\[)([ xX~])(\]\s)/
const BLOCK_PREFIX = /^([ \t]*)((?:>[ \t]?)*)/
const LIST_MARKER = /^([-*+]|(\d{1,9})[.)])([ \t]+|$)/
const THEMATIC_OR_HEADING = /^(?:#{1,6}(?:[ \t]|$)|([-*_])(?:[ \t]*\1){2,}[ \t]*$)/

type BlockContext = { depth: number; paragraph: boolean; offsets: number[] }

// Width of `ws` starting at column `from`; a tab goes to the next multiple of 4.
const indentWidth = (ws: string, from = 0): number => {
  let width = from
  for (const char of ws) width += char === '\t' ? 4 - (width % 4) : 1
  return width - from
}

const closeItems = (ctx: BlockContext, indent: number): void => {
  while (indent < (ctx.offsets.at(-1) ?? 0)) {
    ctx.offsets.pop()
    ctx.paragraph = false
  }
}

const openItem = (ctx: BlockContext, indent: number, marker: RegExpExecArray): void => {
  const gap = indentWidth(marker[3] ?? '', indent + (marker[1] ?? '').length)
  ctx.offsets.push(indent + (marker[1] ?? '').length + (gap >= 1 && gap <= 4 ? gap : 1))
  ctx.paragraph = true
}

// Whether `rawLine` starts a list item, and the context that follows from it.
const isListItem = (ctx: BlockContext, rawLine: string): boolean => {
  const line = rawLine.replace(/\r$/, '')
  const prefix = BLOCK_PREFIX.exec(line) as RegExpExecArray
  const quoteDepth = ((prefix[2] ?? '').match(/>/g) ?? []).length
  if (quoteDepth !== ctx.depth) Object.assign(ctx, { depth: quoteDepth, paragraph: false, offsets: [] })
  const text = quoteDepth > 0 ? line.slice(prefix[0].length) : line
  const content = text.trimStart()
  if (content === '') {
    ctx.paragraph = false
    return false
  }
  const indent = indentWidth(text.slice(0, text.length - content.length))
  const marker = LIST_MARKER.exec(content)
  const textLine = !marker && !THEMATIC_OR_HEADING.test(content)
  // A plain text line under an open paragraph continues it and keeps its items open.
  if (!(ctx.paragraph && textLine)) closeItems(ctx, indent)
  // Indented code, or a continuation of the open paragraph.
  if (indent - (ctx.offsets.at(-1) ?? 0) >= 4) return false
  if (!marker) {
    ctx.paragraph = textLine
    return false
  }
  if (ctx.paragraph && marker[2] !== undefined && Number(marker[2]) !== 1) return false // prose
  openItem(ctx, indent, marker)
  return true
}

export type BoxCounts = { done: number; open: number; waived: number }

export const countBoxes = (body: string): BoxCounts => {
  const counts: BoxCounts = { done: 0, open: 0, waived: 0 }
  const ctx: BlockContext = { depth: 0, paragraph: false, offsets: [] }
  let fence = false
  for (const line of body.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) {
      fence = !fence
      ctx.paragraph = false
      continue
    }
    if (fence || !isListItem(ctx, line)) continue
    const mark = CHECKBOX_LINE.exec(line)?.[2]
    if (mark === undefined) continue
    if (mark === ' ') counts.open++
    else if (mark === '~') counts.waived++
    else counts.done++
  }
  return counts
}

// ── a note ───────────────────────────────────────────────────────────────

/** Reads what the band needs from one task note. */
export const parseNote = (text: string): ParsedNote => {
  const { head, body } = splitNote(text)
  const data = head ? readData(head) : new Map<string, string | string[]>()
  const fields = readFields(data)
  const rawPriority = scalar(fields, 'priority')
  const start = scalar(fields, 'start')
  return {
    status: readStatus(data),
    stage: scalar(fields, 'stage'),
    priority: rawPriority !== null && Number.isFinite(Number(rawPriority)) ? Number(rawPriority) : null,
    ...countBoxes(body),
    lastLog: lastLogDate(body),
    start: start !== null && isValidDay(start) ? start : null,
    hasBranch: scalar(fields, 'branch') !== null,
    hasMr: hasValue(fields, 'mr'),
  }
}

/** The `stalledDays` setting: a whole number of at least 1, else the default. */
export const resolveStalledDays = (value: unknown): number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : DEFAULT_STALLED_DAYS

export type LastTouch = { day: string; source: 'log' | 'start' | 'edited' }

// The last step of a task: the newer of its last Log line and its `start`
// stamp; the note's modification time only when it has neither. (The same rule
// as the Memoz app.) A file time is not part of the maximum: a sync
// that rewrites the file would otherwise reset the clock of a task nobody
// touched.
export const lastTouch = (note: ParsedNote, mtimeMs: number): LastTouch | null => {
  const candidates: LastTouch[] = []
  if (note.lastLog !== null) candidates.push({ day: note.lastLog, source: 'log' })
  if (note.start !== null) candidates.push({ day: note.start, source: 'start' })
  if (candidates.length === 0 && Number.isFinite(mtimeMs) && mtimeMs > 0) {
    candidates.push({ day: utcDay(mtimeMs), source: 'edited' })
  }
  let best: LastTouch | null = null
  for (const candidate of candidates) if (best === null || candidate.day > best.day) best = candidate
  return best
}

const AGENT_STAGES = ['implementing', 'agent-review', 'verified']

// The stage a doing task shows, by the app's rule (its `stageStep`): case and `_`/blank are
// folded; one of the three agent stages is itself; ANY other text (`review` on a doing task, a
// typo, an old value) counts as `implementing` — the task IS being worked on; no text at all is no
// stage (null), and a flag.
const taskStage = (stage: string | null): string | null => {
  const key = (stage ?? '').toLocaleLowerCase('en').replaceAll(/[\s_]+/g, '-')
  if (key === '') return null
  return AGENT_STAGES.includes(key) ? key : 'implementing'
}

/** The flags a task's record raises, most important first. */
export const taskFlags = (
  note: ParsedNote,
  status: 'doing' | 'review',
  ageDays: number | null,
  stalledDays: number,
): BandFlag[] => {
  const flags: BandFlag[] = []
  if (status === 'doing' && ageDays !== null && stalledDays >= 1 && ageDays >= stalledDays) flags.push('stalled')
  if (status === 'doing' && taskStage(note.stage) === null) flags.push('no stage')
  if (status === 'doing' && !note.hasBranch) flags.push('no branch')
  if (status === 'review' && !note.hasMr) flags.push('no MR')
  return flags
}

/** A band task from a parsed note: `today` is `YYYY-MM-DD`. */
export const bandTask = (
  id: string,
  status: 'doing' | 'review',
  note: ParsedNote,
  mtimeMs: number,
  today: string,
  stalledDays: number,
): BandTask => {
  const touch = lastTouch(note, mtimeMs)
  const ageDays = touch ? daysBetween(touch.day, today) : null
  return {
    id,
    status,
    stage: taskStage(note.stage),
    priority: note.priority,
    done: note.done,
    waived: note.waived,
    total: note.done + note.open + note.waived,
    lastDay: touch?.day ?? null,
    lastSource: touch?.source ?? null,
    ageDays,
    flags: taskFlags(note, status, ageDays, stalledDays),
  }
}

// ── what a row says ──────────────────────────────────────────────────────

// `taskStage` already mapped any unknown text to the first step; no stage at all is no step.
export const stageStep = (task: BandTask): number =>
  task.status === 'review' ? STAGE_COUNT : task.stage === null ? 0 : (STAGE_STEPS[task.stage] ?? 1)

/** `review`, the stage, or `no stage` for a doing task without one. */
export const stageName = (task: BandTask): string => (task.status === 'review' ? 'review' : (task.stage ?? 'no stage'))

/** `●●○○`: one dot per step, filled up to the task's step. */
export const stageDots = (task: BandTask): string => {
  const step = stageStep(task)
  return '●'.repeat(step) + '○'.repeat(STAGE_COUNT - step)
}

/** Ticked boxes of all boxes, `[~]` waived ones included in the total — the app's `n/m`. */
export const criteriaText = (task: BandTask): string => (task.total > 0 ? `${task.done}/${task.total}` : '—')

/** The share of ticked boxes; 0 for a note without boxes. */
export const progress = (task: BandTask): number => (task.total > 0 ? task.done / task.total : 0)

/** `today`, `3d ago`, or the date for a step dated in the future; empty when the note has no step. */
export const ageText = (task: BandTask): string => {
  if (task.ageDays === null || task.lastDay === null) return ''
  if (task.ageDays < 0) return task.lastDay.slice(5)
  if (task.ageDays === 0) return 'today'
  return `${task.ageDays}d ago`
}

/** The first flag, `+n` when there are more. */
export const flagText = (task: BandTask): string => {
  const [first, ...rest] = task.flags
  if (first === undefined) return ''
  return rest.length > 0 ? `${first} +${rest.length}` : first
}

const ID_PATTERN = /^([A-Za-z]{2,}-\d+[a-z]?(?:\/T\d+[a-z]?)?)\s*[—–-]\s*(\S.*)$/

/** `ABC-77 — title` and `XX-12/T3 — title` split into code and title; any other name is all title. */
export const taskLabel = (task: BandTask): { code: string; title: string } => {
  const match = ID_PATTERN.exec(task.id)
  return match ? { code: match[1]!, title: match[2]! } : { code: '', title: task.id }
}

/** The whole row as one sentence: the desktop row's alt text. */
export const rowAlt = (task: BandTask): string => {
  const { code, title } = taskLabel(task)
  const parts = [code === '' ? title : `${code} ${title}`]
  if (task.priority !== null) parts.push(`priority ${task.priority}`)
  parts.push(
    task.status === 'doing' && task.stage === null ? 'no stage' : `stage ${stageName(task)} ${stageStep(task)}/${STAGE_COUNT}`,
  )
  if (task.total > 0) {
    const waived = task.waived > 0 ? ` (${task.waived} waived)` : ''
    parts.push(`criteria ${task.done}/${task.total}${waived}`)
  } else parts.push('no criteria')
  const age = ageText(task)
  if (age !== '') parts.push(`last step ${age}${task.lastSource === 'edited' ? ' (note edited)' : ''}`)
  if (task.flags.length > 0) parts.push(`flags: ${task.flags.join(', ')}`)
  return parts.join(', ')
}

// ── the terminal row ─────────────────────────────────────────────────────

export type RunKind = 'fill' | 'empty' | 'tick-fill' | 'tick-empty'
export type Run = { kind: RunKind; text: string }

// The bar as runs of one style each: filled cells, empty cells, and a tick at
// every box boundary (when each box gets at least two cells). It shows the
// criteria only; the stage has its own dots.
export const barRuns = (task: BandTask, width: number): Run[] => {
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

  const runs: Run[] = []
  for (const cell of cells) {
    const last = runs[runs.length - 1]
    if (last && last.kind === cell.kind) last.text += cell.char
    else runs.push({ kind: cell.kind, text: cell.char })
  }
  return runs
}

// ── display width ────────────────────────────────────────────────────────
//
// A terminal cell is a COLUMN, not a UTF-16 unit: a CJK character or an emoji takes two columns, a
// combining mark none, a ZWJ family one emoji. Text is cut only between grapheme clusters, so a
// surrogate pair or a ZWJ sequence is never split (a lone surrogate would break the row, and the
// desktop's SVG with it). Dependency-free: `Intl.Segmenter` when the runtime has it, a small
// code-point splitter when it does not.

type Segmenter = { segment: (text: string) => Iterable<{ segment: string }> }

const nativeSegmenter: Segmenter | null =
  typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null

const EXTENDS = /^[\p{M}\u200D\uFE0F\u{1F3FB}-\u{1F3FF}\u{E0020}-\u{E007F}]$/u
const REGIONAL = /^[\u{1F1E6}-\u{1F1FF}]$/u

/** Grapheme clusters of `text`; `segmenter` is injectable so the fallback can be tested. */
export const splitGraphemes = (text: string, segmenter: Segmenter | null = nativeSegmenter): string[] => {
  if (segmenter) return Array.from(segmenter.segment(text), part => part.segment)
  const clusters: string[] = []
  let joiner = false // the last code point was a ZWJ: the next one joins its cluster
  let regionals = 0 // regional indicators in the open cluster (a flag is a pair)
  for (const char of text) {
    const isRegional = REGIONAL.test(char)
    const joins = clusters.length > 0 && (joiner || EXTENDS.test(char) || (isRegional && regionals === 1))
    if (joins) clusters[clusters.length - 1] += char
    else clusters.push(char)
    regionals = isRegional ? (joins ? regionals + 1 : 1) : EXTENDS.test(char) ? regionals : 0
    joiner = char === '\u200D'
  }
  return clusters
}

const ZERO_WIDTH = /^[\p{Cc}\p{Mn}\p{Me}\u200B-\u200F\u2060\uFE00-\uFE0F]/u
// East Asian Wide and Fullwidth blocks (and the emoji blocks), tested on the cluster's first code point.
const WIDE =
  /^[\u1100-\u115F\u2E80-\u303E\u3041-\u33FF\u3400-\u4DBF\u4E00-\u9FFF\uA000-\uA4CF\uA960-\uA97F\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6\u{1F300}-\u{1F64F}\u{1F900}-\u{1F9FF}\u{20000}-\u{3FFFD}]/u
const EMOJI = /\p{Emoji_Presentation}|\uFE0F|\u200D|[\u{1F1E6}-\u{1F1FF}]/u

/** Display columns of one grapheme cluster: 0, 1 or 2. */
export const graphemeWidth = (cluster: string): number => {
  if (cluster === '' || ZERO_WIDTH.test(cluster)) return 0
  return WIDE.test(cluster) || EMOJI.test(cluster) ? 2 : 1
}

/** Display columns of `text`. */
export const displayWidth = (text: string, segmenter: Segmenter | null = nativeSegmenter): number => {
  let columns = 0
  for (const cluster of splitGraphemes(text, segmenter)) columns += graphemeWidth(cluster)
  return columns
}

/** `text` cut to at most `width` columns, on a grapheme boundary, with a `…` when something went. */
export const truncate = (text: string, width: number, segmenter: Segmenter | null = nativeSegmenter): string => {
  if (width <= 0) return ''
  if (displayWidth(text, segmenter) <= width) return text
  let used = 0
  let kept = ''
  for (const cluster of splitGraphemes(text, segmenter)) {
    const columns = graphemeWidth(cluster)
    if (used + columns > width - 1) break
    kept += cluster
    used += columns
  }
  return `${kept}…`
}

/** `text` padded with blanks on the right to `width` columns. */
export const padDisplay = (text: string, width: number): string =>
  text + ' '.repeat(Math.max(0, width - displayWidth(text)))

export const byPriority = (a: BandTask, b: BandTask): number => {
  const pa = a.priority ?? Number.MAX_SAFE_INTEGER
  const pb = b.priority ?? Number.MAX_SAFE_INTEGER
  if (pa !== pb) return pa - pb
  if (a.status !== b.status) return a.status === 'doing' ? -1 : 1
  return a.id.localeCompare(b.id)
}

/** `P1`; empty for a task without a priority. */
export const priorityText = (task: BandTask): string => (task.priority === null ? '' : `P${task.priority}`)

export type RowLayout = {
  /** Width of the priority column with its blank (`P1 `); 0 when no row has a priority. */
  priorityWidth: number
  /** Width of the code column (`ABC-77`); 0 when no row has one. */
  codeWidth: number
  titleWidth: number
  barWidth: number
  countWidth: number
  /** Width of the stage name after the dots; 0 = dots only. */
  stageWidth: number
  /** Width of the last-step age; 0 = not shown. */
  ageWidth: number
  /** Width of the flag column; 0 = no row has a flag. */
  flagWidth: number
  /** The flag column holds only `!`: the text did not fit. */
  flagMark: boolean
}

const MIN_TITLE = 10
const MIN_BAR = 8
const GAP = 2
const HIDE_WIDTH = 1 // ✕

// The width a row takes: "P1 " (as wide as the widest priority, plus a blank) code title  dots name  bar count  age  flag  ✕
// with a single space between the code and the title and the bar and its
// count, two between the other groups.
export const rowWidth = (layout: RowLayout): number =>
  layout.priorityWidth +
  (layout.codeWidth > 0 ? layout.codeWidth + 1 : 0) +
  layout.titleWidth +
  GAP +
  (STAGE_COUNT + (layout.stageWidth > 0 ? 1 + layout.stageWidth : 0)) +
  GAP +
  layout.barWidth +
  1 +
  layout.countWidth +
  (layout.ageWidth > 0 ? GAP + layout.ageWidth : 0) +
  (layout.flagWidth > 0 ? GAP + layout.flagWidth : 0) +
  GAP +
  HIDE_WIDTH

const widest = (tasks: readonly BandTask[], text: (task: BandTask) => string): number =>
  Math.max(0, ...tasks.map(task => displayWidth(text(task))))

// When the band is too narrow for the whole row, pieces go in this order: the
// flag text becomes a `!`, the stage name goes (the dots stay), the age goes,
// and last the title shrinks down to 4 columns. The id, the criteria bar with
// its count, the stage dots and the flag mark are never dropped.
export const rowLayout = (tasks: readonly BandTask[], columns: number): RowLayout => {
  const codeWidth = Math.min(14, widest(tasks, task => taskLabel(task).code))
  const countWidth = widest(tasks, criteriaText)
  const wantedTitle = Math.max(
    MIN_TITLE,
    Math.min(widest(tasks, task => taskLabel(task).title), 40, Math.floor(columns / 3)),
  )
  const flagWidth = Math.min(24, widest(tasks, flagText))
  const nameWidth = widest(tasks, stageName)
  const ageWidth = widest(tasks, ageText)
  const markWidth = flagWidth > 0 ? 1 : 0
  const widestPriority = widest(tasks, priorityText)
  const priorityWidth = widestPriority > 0 ? widestPriority + 1 : 0
  const base = { priorityWidth, codeWidth, countWidth, titleWidth: 0, barWidth: 0 }
  const steps: { layout: RowLayout; minTitle: number }[] = [
    { layout: { ...base, stageWidth: nameWidth, ageWidth, flagWidth, flagMark: false }, minTitle: MIN_TITLE },
    { layout: { ...base, stageWidth: nameWidth, ageWidth, flagWidth: markWidth, flagMark: true }, minTitle: MIN_TITLE },
    { layout: { ...base, stageWidth: 0, ageWidth, flagWidth: markWidth, flagMark: true }, minTitle: MIN_TITLE },
    { layout: { ...base, stageWidth: 0, ageWidth: 0, flagWidth: markWidth, flagMark: true }, minTitle: MIN_TITLE },
    { layout: { ...base, stageWidth: 0, ageWidth: 0, flagWidth: markWidth, flagMark: true }, minTitle: 4 },
  ]
  const chosen =
    steps.find(step => columns - rowWidth(step.layout) >= step.minTitle + MIN_BAR) ?? steps[steps.length - 1]!
  const room = columns - rowWidth(chosen.layout)
  const titleWidth = Math.max(4, Math.min(wantedTitle, room - MIN_BAR))
  const barWidth = Math.max(MIN_BAR, room - titleWidth)
  return { ...chosen.layout, titleWidth, barWidth }
}

/** The text cells of one terminal row, each already padded to its column. */
export type RowCells = {
  priority: string
  code: string
  title: string
  dots: string
  name: string
  count: string
  age: string
  flag: string
}

export const rowCells = (task: BandTask, layout: RowLayout): RowCells => {
  const { code, title } = taskLabel(task)
  const flag = task.flags.length === 0 ? '' : layout.flagMark ? '!' : truncate(flagText(task), layout.flagWidth)
  return {
    priority: priorityText(task).padEnd(layout.priorityWidth),
    code: layout.codeWidth > 0 ? `${padDisplay(truncate(code, layout.codeWidth), layout.codeWidth)} ` : '',
    title: padDisplay(truncate(title, layout.titleWidth), layout.titleWidth),
    dots: stageDots(task),
    name: layout.stageWidth > 0 ? ` ${padDisplay(stageName(task), layout.stageWidth)}` : '',
    count: criteriaText(task).padStart(layout.countWidth),
    age: layout.ageWidth > 0 ? ageText(task).padStart(layout.ageWidth) : '',
    flag: layout.flagWidth > 0 ? padDisplay(flag, layout.flagWidth) : '',
  }
}

/** The whole terminal row as one string — what the cells draw, `displayWidth` of it is `rowWidth(layout)`. */
export const rowLine = (task: BandTask, layout: RowLayout): string => {
  const cells = rowCells(task, layout)
  const bar = barRuns(task, layout.barWidth).map(run => run.text).join('')
  const age = layout.ageWidth > 0 ? `  ${cells.age}` : ''
  const flag = layout.flagWidth > 0 ? `  ${cells.flag}` : ''
  return `${cells.priority}${cells.code}${cells.title}  ${cells.dots}${cells.name}  ${bar} ${cells.count}${age}${flag}  ✕`
}
