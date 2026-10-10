import type { TaskStats } from '../types'
import { countOf, countOther, donePercent, priorityLabel, priorityOrder, shiftDay, WEEKS } from './stats'

/** Width of the drawing in CSS pixels; the pane scales it down when narrower. */
export const WIDTH = 440

/** Stack order follows the palette's slot order, so adjacent segments stay CVD-safe. */
const SEGMENTS = [
  { status: 'done', color: 'var(--s1)' },
  { status: 'todo', color: 'var(--s2)' },
  { status: 'doing', color: 'var(--s3)' },
  { status: 'review', color: 'var(--s4)' },
  { status: 'dropped', color: 'var(--muted)' },
  { status: 'other', color: 'var(--ink2)' },
] as const

/** A status's count, with "other" standing for every status outside the known five. */
const countFor = (s: TaskStats, status: string) => (status === 'other' ? countOther(s) : countOf(s, status))

const STYLE = `
svg { --s1:#2a78d6; --s2:#eb6834; --s3:#1baf7a; --s4:#eda100; --ink:#0b0b0b; --ink2:#52514e;
  --muted:#898781; --grid:#e1e0d9; --tile:rgba(11,11,11,0.03); --ring:rgba(11,11,11,0.10);
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
@media (prefers-color-scheme: dark) {
  svg { --s1:#3987e5; --s2:#d95926; --s3:#199e70; --s4:#c98500; --ink:#ffffff; --ink2:#c3c2b7;
    --grid:#2c2c2a; --tile:rgba(255,255,255,0.04); --ring:rgba(255,255,255,0.10); }
}
.label { font-size: 11px; fill: var(--ink2); }
.value { font-size: 22px; font-weight: 600; fill: var(--ink); }
.title { font-size: 12px; font-weight: 600; fill: var(--ink); }
.note { font-size: 11px; fill: var(--muted); }
.num { font-size: 11px; fill: var(--ink2); font-variant-numeric: tabular-nums; }
.bar:hover { opacity: 0.8; }`

const esc = (text: string | number) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const text = (x: number, y: number, cls: string, body: string | number, anchor = 'start') =>
  `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${esc(body)}</text>`

/** A bar rounded on its top corners (r ≤ 4), anchored to the baseline at y + h. */
function columnPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h)
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
}

/** A bar rounded on its right corners (r ≤ 4), anchored to the axis at x. */
function rowPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, h / 2, w)
  return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`
}

function kpis(s: TaskStats, y: number): string {
  const tiles = [
    { label: 'Tasks', value: `${s.main.total}+${s.sub.total}`, note: 'main + sub' },
    { label: 'Doing', value: countOf(s, 'doing'), note: 'in progress' },
    { label: 'Review', value: countOf(s, 'review'), note: 'waiting' },
    { label: 'Todo', value: countOf(s, 'todo'), note: 'open' },
  ]
  const gap = 8
  const w = (WIDTH - gap * (tiles.length - 1)) / tiles.length
  return tiles
    .map((t, i) => {
      const x = i * (w + gap)
      return [
        `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="63" rx="8" fill="var(--tile)" stroke="var(--ring)"/>`,
        text(x + 12, y + 18, 'label', t.label),
        text(x + 12, y + 44, 'value', t.value),
        text(x + 12, y + 57, 'note', t.note),
      ].join('')
    })
    .join('')
}

function statusBar(s: TaskStats, y: number): string {
  const total = s.main.total + s.sub.total
  const parts = SEGMENTS.map(seg => ({ ...seg, n: countFor(s, seg.status) })).filter(p => p.n > 0)
  const gap = 2
  const room = WIDTH - gap * (parts.length - 1)
  let x = 0
  const rects = parts
    .map(p => {
      // at least 3px so a single task still shows
      const w = Math.max(3, (room * p.n) / Math.max(1, total))
      const rect = `<rect class="bar" x="${x}" y="${y + 22}" width="${w}" height="14" fill="${p.color}"><title>${esc(`${p.status}: ${p.n}`)}</title></rect>`
      x += w + gap
      return rect
    })
    .join('')
  let lx = 0
  const legend = SEGMENTS.filter(seg => seg.status !== 'other' || countOther(s) > 0).map(seg => {
    const label = `${seg.status} ${countFor(s, seg.status)}`
    const item = `<rect x="${lx}" y="${y + 47}" width="8" height="8" rx="2" fill="${seg.color}"/>${text(lx + 12, y + 55, 'num', label)}`
    lx += 20 + label.length * 6
    return item
  }).join('')
  return [
    text(0, y + 12, 'title', 'Status'),
    text(WIDTH, y + 12, 'note', `${donePercent(s)}% done of not dropped`, 'end'),
    `<clipPath id="stack"><rect x="0" y="${y + 22}" width="${WIDTH}" height="14" rx="4"/></clipPath>`,
    `<g clip-path="url(#stack)">${rects}</g>`,
    legend,
  ].join('')
}

function weekly(s: TaskStats, y: number): string {
  const top = y + 26
  const h = 70
  const gap = 6
  const w = (WIDTH - gap * (WEEKS - 1)) / WEEKS
  const max = Math.max(1, ...s.weeklyDone)
  const peak = s.weeklyDone.indexOf(max)
  const bars = s.weeklyDone
    .map((n, i) => {
      const bh = (h * n) / max
      const x = i * (w + gap)
      const end = shiftDay(s.today, -(WEEKS - 1 - i) * 7)
      const hit = `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="transparent"><title>${esc(`7 days to ${end}: ${n} closed`)}</title></rect>`
      const bar = n === 0 ? '' : `<path class="bar" d="${columnPath(x, top + h - bh, w, bh)}" fill="var(--s1)"/>`
      const label = i === peak || i === WEEKS - 1 ? text(x + w / 2, top + h - bh - 4, 'num', n, 'middle') : ''
      return `<g>${bar}${label}${hit}</g>`
    })
    .join('')
  return [
    text(0, y + 12, 'title', 'Closed per week'),
    text(WIDTH, y + 12, 'note', `last 7 days ${s.doneLast7} · last 30 days ${s.doneLast30}`, 'end'),
    bars,
    `<line x1="0" x2="${WIDTH}" y1="${top + h + 0.5}" y2="${top + h + 0.5}" stroke="var(--grid)"/>`,
    text(0, top + h + 14, 'note', `${WEEKS} weeks ago`),
    text(WIDTH, top + h + 14, 'note', 'this week', 'end'),
  ].join('')
}

function priorities(s: TaskStats, y: number): string {
  const keys = priorityOrder(Object.keys(s.todoByPriority))
  const max = Math.max(1, ...Object.values(s.todoByPriority))
  const axis = 44
  const room = WIDTH - axis - 36
  const rows = keys
    .map((k, i) => {
      const n = s.todoByPriority[k] ?? 0
      const ry = y + 24 + i * 20
      const w = Math.max(3, (room * n) / max)
      return [
        text(0, ry + 11, 'num', priorityLabel(k)),
        `<path class="bar" d="${rowPath(axis, ry, w, 14)}" fill="var(--s1)"><title>${esc(`${k === 'none' ? 'no priority' : priorityLabel(k)}: ${n} todo`)}</title></path>`,
        text(axis + w + 6, ry + 11, 'num', n),
      ].join('')
    })
    .join('')
  return [
    text(0, y + 12, 'title', 'Todo by priority'),
    keys.length === 0 ? text(0, y + 34, 'note', 'nothing open') : rows,
  ].join('')
}

/** The whole dashboard as one SVG document, and its height. */
export function dashboardSvg(s: TaskStats): { source: string; height: number } {
  const prioRows = Math.max(1, Object.keys(s.todoByPriority).length)
  const height = 64 + 20 + 64 + 20 + 124 + 20 + 24 + prioRows * 20
  const body = [
    kpis(s, 0),
    statusBar(s, 84),
    weekly(s, 168),
    priorities(s, 312),
  ].join('')
  return {
    height,
    source: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${height}" width="${WIDTH}" height="${height}"><style>${STYLE}</style>${body}</svg>`,
  }
}

/** Plain-text summary for readers that cannot see the drawing. */
export function dashboardAlt(s: TaskStats): string {
  return `${s.prefix}: ${s.main.total} main and ${s.sub.total} sub-tasks; doing ${countOf(s, 'doing')}, review ${countOf(s, 'review')}, todo ${countOf(s, 'todo')}, done ${countOf(s, 'done')} (${donePercent(s)}%); closed in the last 7 days ${s.doneLast7}.`
}

/** The doing and review tasks as a markdown list. */
export function activeMarkdown(s: TaskStats): string {
  if (s.active.length === 0) return '_Nothing in doing or review._'
  const lines = s.active.map(t => {
    const where = t.parent === undefined ? '' : `${t.parent.split(' ')[0]} / `
    return `- **${t.status}** · ${where}${t.name.replace(/([*_`[\]])/g, '\\$1')}`
  })
  return ['#### Active', ...lines].join('\n')
}
