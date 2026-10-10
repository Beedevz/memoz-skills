import type { StatusCounts, TaskStats } from '../types'

/** One note as read from the vault; `dirs` are the folders between the declared folder and the note. */
export type TaskNote = { name: string; dirs: string[]; text: string }

export type Frontmatter = { status?: string; priority?: string; done?: string }

/** Reads the three fields the stats use from a note's leading `---` block. */
export function parseFrontmatter(text: string): Frontmatter {
  const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  const body = block?.[1]
  if (body === undefined) return {}
  const field = (key: string) => {
    const value = new RegExp(`^${key}:[ \\t]*(.+?)[ \\t]*$`, 'm').exec(body)?.[1]
    return value?.replace(/^["']|["']$/g, '')
  }
  return { status: field('status'), priority: field('priority'), done: field('done') }
}

const DAY_MS = 86_400_000
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/** `YYYY-MM-DD` of the local day at `now`: the day a person writes into `done:`. */
export function localDay(now: number): string {
  const d = new Date(now)
  const two = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`
}

/** The calendar day `days` after `day` (negative for before); both `YYYY-MM-DD`. */
export function shiftDay(day: string, days: number): string {
  return new Date(Date.parse(day) + days * DAY_MS).toISOString().slice(0, 10)
}

/** Whole days from `from` to `to`, or undefined when `from` is not a real `YYYY-MM-DD` day. */
function daysBetween(from: string, to: string): number | undefined {
  if (!ISO_DAY.test(from)) return undefined
  const at = Date.parse(from)
  if (Number.isNaN(at) || new Date(at).toISOString().slice(0, 10) !== from) return undefined
  return Math.round((Date.parse(to) - at) / DAY_MS)
}

/** The five statuses the task schema names; anything else is counted as "other". */
export const KNOWN_STATUSES = ['doing', 'review', 'todo', 'done', 'dropped'] as const

/** How many 7-day windows `weeklyDone` covers. */
export const WEEKS = 12

const bump = (counts: StatusCounts, key: string) => {
  counts[key] = (counts[key] ?? 0) + 1
}

/**
 * Notes without `status` are skipped. A note named after a task id (`<prefix>-<number>…`) is a main
 * task, at any depth. Any other note whose nearest task-id folder above it names a task is a
 * sub-task of that task. Every remaining status note (a decision such as `<prefix>-D1`, a plan) is
 * not a task: it only adds to `unprefixed`, so a project folder that also holds decisions or plans
 * counts just its tasks.
 */
export function computeStats(notes: TaskNote[], prefix: string, vaultPath: string, now: number, today: string): TaskStats {
  const stats: TaskStats = {
    prefix,
    vaultPath,
    main: { total: 0, byStatus: {} },
    sub: { total: 0, byStatus: {} },
    unprefixed: 0,
    todoByPriority: {},
    active: [],
    doneLast7: 0,
    doneLast30: 0,
    weeklyDone: new Array<number>(WEEKS).fill(0),
    computedAt: now,
    today,
  }
  // A task id is the prefix, a dash and a number (`ABC-12`); `ABC-D1` (a decision id) is not one.
  const id = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d`)
  const isTask = (name: string) => id.test(name)
  for (const note of notes) {
    const fm = parseFrontmatter(note.text)
    if (fm.status === undefined) continue
    const parent = isTask(note.name) ? undefined : note.dirs.findLast(isTask)
    if (parent === undefined && !isTask(note.name)) {
      stats.unprefixed++
      continue
    }
    const group = parent === undefined ? stats.main : stats.sub
    group.total++
    bump(group.byStatus, fm.status)
    if (fm.status === 'todo') bump(stats.todoByPriority, fm.priority ?? 'none')
    if (fm.status === 'doing' || fm.status === 'review') {
      stats.active.push({ name: note.name.replace(/\.md$/, ''), status: fm.status, parent })
    }
    // A done value that is not a real past day (a link, `true`, a future typo) counts nowhere.
    const age = fm.status === 'done' && fm.done !== undefined ? daysBetween(fm.done, today) : undefined
    if (age !== undefined && age >= 0) {
      if (age < 7) stats.doneLast7++
      if (age < 30) stats.doneLast30++
      const slot = WEEKS - 1 - Math.floor(age / 7)
      if (slot >= 0) stats.weeklyDone[slot] = (stats.weeklyDone[slot] ?? 0) + 1
    }
  }
  // sub-tasks sort under their parent task
  const key = (t: { name: string; parent?: string }) => `${t.parent ?? t.name}\u0000${t.parent === undefined ? '' : t.name}`
  stats.active.sort((a, b) => a.status.localeCompare(b.status) || key(a).localeCompare(key(b)))
  return stats
}

/** Count of a status across main and sub-tasks. */
export function countOf(stats: TaskStats, status: string): number {
  return (stats.main.byStatus[status] ?? 0) + (stats.sub.byStatus[status] ?? 0)
}

/** Tasks whose status is none of the known five, so every row adds up to its total. */
export function countOther(stats: TaskStats): number {
  return stats.main.total + stats.sub.total - KNOWN_STATUSES.reduce((n, k) => n + countOf(stats, k), 0)
}

/** Numeric priorities in number order, then labels alphabetically, then "none". */
export function priorityOrder(keys: string[]): string[] {
  const rank = (k: string) => (k === 'none' ? 2 : /^\d+$/.test(k) ? 0 : 1)
  return [...keys].sort((a, b) => rank(a) - rank(b) || (rank(a) === 0 ? Number(a) - Number(b) : a < b ? -1 : a > b ? 1 : 0))
}

/** `P2` for a numeric priority; a label (`P1`, `high`) and `none` as they are. */
export function priorityLabel(key: string): string {
  return /^\d+$/.test(key) ? `P${key}` : key
}

/** The pane's line for status notes that are not tasks, or undefined when there are none. */
export function otherNotesLine(stats: TaskStats): string | undefined {
  const n = stats.unprefixed
  return n === 0 ? undefined : `${n} other status ${n === 1 ? 'note' : 'notes'} (not tasks, not counted)`
}

/** Done share of the tasks that were not dropped, as a whole percent. */
export function donePercent(stats: TaskStats): number {
  const total = stats.main.total + stats.sub.total - countOf(stats, 'dropped')
  return total === 0 ? 0 : Math.round((100 * countOf(stats, 'done')) / total)
}

export function statusLine(stats: TaskStats): string {
  return [
    `${stats.prefix} ${stats.main.total}+${stats.sub.total} tasks`,
    `doing ${countOf(stats, 'doing')}`,
    `review ${countOf(stats, 'review')}`,
    `todo ${countOf(stats, 'todo')}`,
    `${donePercent(stats)}% done`,
    `7d +${stats.doneLast7}`,
  ].join(' · ')
}
