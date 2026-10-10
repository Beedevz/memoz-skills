import { expect, test } from 'claude-code/testing'

import {
  computeStats,
  countOther,
  donePercent,
  parseFrontmatter,
  priorityLabel,
  priorityOrder,
  statusLine,
  type TaskNote,
} from '../hooks/stats'

const note = (name: string, fm: string, parent?: string): TaskNote => ({
  name,
  parent,
  text: `---\n${fm}\n---\n\n# ${name}\n`,
})

// 2026-10-10T12:00:00Z, and the same local day
const NOW = Date.UTC(2026, 9, 10, 12)
const TODAY = '2026-10-10'

const NOTES: TaskNote[] = [
  note('ABC-1 — a.md', 'status: done\npriority: 2\ndone: 2026-10-08'),
  note('ABC-2 — b.md', 'status: done\ndone: 2026-09-20'),
  note('ABC-3 — c.md', 'status: done\ndone: 2026-08-01'),
  note('ABC-4 — d.md', 'status: doing\npriority: 2'),
  note('ABC-5 — e.md', 'status: todo\npriority: 1'),
  note('ABC-6 — f.md', 'status: todo'),
  note('ABC-7 — g.md', 'status: dropped'),
  note('T1 — sub.md', 'status: review', 'ABC-4'),
  note('T2 — sub.md', 'status: todo\npriority: 3', 'ABC-4'),
  note('loose idea.md', 'status: todo'),
  note('ABC-8 — no status.md', 'date: 2026-10-01'),
  note('T1 — other project.md', 'status: doing', 'XY-1'),
]

test('parseFrontmatter reads status, priority and done, and nothing without a block', () => {
  expect(parseFrontmatter('---\nstatus: doing\npriority: 2\ndone: "2026-10-01"\n---\nbody')).toEqual({
    status: 'doing',
    priority: '2',
    done: '2026-10-01',
  })
  expect(parseFrontmatter('# no frontmatter\nstatus: doing')).toEqual({})
})

test('computeStats splits main and sub-tasks by prefix and skips notes without status', () => {
  const s = computeStats(NOTES, 'ABC', '/v/Tasks', NOW, TODAY)
  expect(s.main).toEqual({ total: 7, byStatus: { done: 3, doing: 1, todo: 2, dropped: 1 } })
  expect(s.sub).toEqual({ total: 2, byStatus: { review: 1, todo: 1 } })
  expect(s.unprefixed).toBe(1)
  expect(s.todoByPriority).toEqual({ '1': 1, none: 1, '3': 1 })
  expect(s.active).toEqual([
    { name: 'ABC-4 — d', status: 'doing', parent: undefined },
    { name: 'T1 — sub', status: 'review', parent: 'ABC-4' },
  ])
})

test('computeStats counts closures in the last 7 and 30 days from the done date', () => {
  const s = computeStats(NOTES, 'ABC', '/v/Tasks', NOW, TODAY)
  expect(s.doneLast7).toBe(1)
  expect(s.doneLast30).toBe(2)
  // ages in days: 2026-10-08 → 2 (last window), 2026-09-20 → 20 (window 9), 2026-08-01 → 70 (window 1)
  expect(s.weeklyDone).toEqual([0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1])
})

test('done percent leaves dropped tasks out, and the status line carries every count', () => {
  const s = computeStats(NOTES, 'ABC', '/v/Tasks', NOW, TODAY)
  // 3 done of 9 tasks minus 1 dropped
  expect(donePercent(s)).toBe(38)
  expect(statusLine(s)).toBe('ABC 7+2 tasks · doing 1 · review 1 · todo 3 · 38% done · 7d +1')
})

test('closures are dated by the local day, not the UTC day', () => {
  // 01:30 on 2026-10-10 at UTC+3 is still 2026-10-09 in UTC
  const early = Date.UTC(2026, 9, 9, 22, 30)
  const s = computeStats([note('ABC-1 — a.md', 'status: done\ndone: 2026-10-10')], 'ABC', '/v', early, '2026-10-10')
  expect(s.doneLast7).toBe(1)
  expect(s.weeklyDone[11]).toBe(1)
})

test('a done value that is not a past ISO date counts nowhere', () => {
  const odd = ['true', '[[2026-10-08]]', '2026-11-01', '2026-13-45', '2026-09-31'].map((d, i) => note(`ABC-${i} — x.md`, `status: done\ndone: ${d}`))
  const s = computeStats(odd, 'ABC', '/v', NOW, TODAY)
  expect(s.doneLast7).toBe(0)
  expect(s.doneLast30).toBe(0)
  expect(s.weeklyDone.every(n => n === 0)).toBe(true)
  expect(s.main.byStatus.done).toBe(5)
})

test('statuses outside the known five are counted as other, so the columns add up', () => {
  const s = computeStats([...NOTES, note('ABC-9 — z.md', 'status: blocked')], 'ABC', '/v', NOW, TODAY)
  expect(countOther(s)).toBe(1)
  expect(s.main.total).toBe(8)
})

test('priorities sort numerically, labels first, none last; only numbers get a P', () => {
  expect(priorityOrder(['none', '10', 'high', '2', 'P1'])).toEqual(['2', '10', 'P1', 'high', 'none'])
  expect(['2', 'P1', 'high', 'none'].map(priorityLabel)).toEqual(['P2', 'P1', 'high', 'none'])
})
