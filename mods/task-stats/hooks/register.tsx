import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { StatsResult, TaskStats } from '../types'
import { activeMarkdown, dashboardAlt, dashboardSvg } from './dashboard'
import {
  computeStats,
  countOf,
  countOther,
  donePercent,
  KNOWN_STATUSES,
  localDay,
  otherNotesLine,
  priorityLabel,
  priorityOrder,
  statusLine,
  type TaskNote,
} from './stats'

const PANE = 'memoz-task-stats'
const REFRESH_MS = 60_000
const COLUMNS = [...KNOWN_STATUSES, 'other'] as const

const stats = atom({ plugin: 'memoz-task-stats', key: 'stats' } as const, null as StatsResult)

type Cached = { mtimeMs: number; size: number; text: string }

// Note text by path from the last scan, reused while a file's mtime and size are unchanged.
// Rebuilt on every scan, so deleted or renamed notes drop out. Lost on reload: one full read.
let cache = new Map<string, Cached>()

type Declaration = { prefix?: unknown; backend?: unknown; vault?: unknown; folder?: unknown }

/** The nearest `.memoz/tasks.json` at or above `cwd`, the file system root included. */
async function findDeclaration($: EngineInterface, cwd: string): Promise<Declaration | undefined> {
  let dir = cwd.replace(/\/+$/, '')
  for (;;) {
    const path = `${dir}/.memoz/tasks.json`
    if (await $.fs.exists(path)) {
      const parsed: unknown = JSON.parse(await $.fs.read(path))
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Declaration) : undefined
    }
    if (dir === '') return undefined
    dir = dir.slice(0, dir.lastIndexOf('/'))
  }
}

type NoteFile = { path: string; name: string; dirs: string[]; mtimeMs: number; size: number }

/** Every `.md` note under `folder`, at any depth, folders listed in parallel; dot-names are skipped. */
async function listNotes($: EngineInterface, folder: string, dirs: string[] = []): Promise<NoteFile[]> {
  const entries = (await $.fs.list(folder)).filter(e => !e.name.startsWith('.'))
  const nested = await Promise.all(
    entries.filter(e => e.kind === 'dir').map(dir => listNotes($, `${folder}/${dir.name}`, [...dirs, dir.name])),
  )
  const here = entries
    .filter(e => e.kind === 'file' && e.name.endsWith('.md'))
    .map(e => ({ path: `${folder}/${e.name}`, name: e.name, dirs, mtimeMs: e.mtimeMs, size: e.size }))
  return [...here, ...nested.flat()]
}

// At most this many note reads at once, so the first scan of a large folder does not open every file together.
const READ_BATCH = 32

async function readNote($: EngineInterface, file: NoteFile, next: Map<string, Cached>): Promise<TaskNote> {
  const hit = cache.get(file.path)
  const isFresh = hit !== undefined && hit.mtimeMs === file.mtimeMs && hit.size === file.size
  const text = isFresh ? hit.text : await $.fs.read(file.path)
  next.set(file.path, { mtimeMs: file.mtimeMs, size: file.size, text })
  return { name: file.name, dirs: file.dirs, text }
}

async function readNotes($: EngineInterface, folder: string): Promise<TaskNote[]> {
  const next = new Map<string, Cached>()
  const files = await listNotes($, folder)
  const notes: TaskNote[] = []
  for (let i = 0; i < files.length; i += READ_BATCH) {
    notes.push(...(await Promise.all(files.slice(i, i + READ_BATCH).map(file => readNote($, file, next)))))
  }
  cache = next
  return notes
}

// A vault declared by name is looked up under vaultsDir, which the person sets; an absolute
// path is used as is. Nothing is guessed: an unset vaultsDir is reported, never counted as zero.
async function vaultPath($: EngineInterface, vault: string, vaultsDir: string): Promise<string | null> {
  if (vault.startsWith('/')) return vault
  if (vaultsDir === '') return null
  const home = (await $.env.get('HOME')) ?? ''
  return `${vaultsDir.replace(/^~(?=\/|$)/, home).replace(/\/+$/, '')}/${vault}`
}

const text = (value: unknown) => (typeof value === 'string' && value !== '' ? value : undefined)

async function collect($: EngineInterface, vaultsDir: string): Promise<StatsResult> {
  const decl = await findDeclaration($, await $.session.cwd())
  if (decl === undefined) return null
  if (decl.backend !== 'vault') return { idle: 'tasks are not tracked in a vault here' }
  const name = text(decl.vault)
  const prefix = text(decl.prefix)
  if (name === undefined) return { problem: 'tasks.json names no vault' }
  if (prefix === undefined) return { problem: 'tasks.json declares no prefix to count' }
  const vault = await vaultPath($, name, vaultsDir)
  if (vault === null) return { problem: `set vaultsDir in /config to the folder that holds the "${name}" vault` }
  // the same default folder as memoz-task-band
  const folder = `${vault}/${text(decl.folder) ?? 'Tasks'}`
  if (!(await $.fs.exists(folder))) return { problem: `no task folder at ${folder}` }
  const notes = await readNotes($, folder)
  const now = await $.clock.now()
  return computeStats(notes, prefix, folder, now, localDay(now))
}

// Set once per load from the plugin's options.
let vaultsDir = ''

// One scan at a time: the timer, a finished turn and /task-stats share the scan in flight
// instead of racing it, so an older scan can never overwrite a newer one.
let running: Promise<StatsResult> | undefined

function refresh($: EngineInterface): Promise<StatsResult> {
  running ??= scan($).finally(() => {
    running = undefined
  })
  return running
}

async function scan($: EngineInterface): Promise<StatsResult> {
  let result: StatsResult
  try {
    result = await collect($, vaultsDir)
  } catch (e) {
    result = { problem: `could not read tasks: ${e instanceof Error ? e.message : String(e)}` }
  }
  await update($, stats, () => result)
  if (result === null || 'idle' in result) $.ui.status(undefined)
  else if ('problem' in result) $.ui.status(`tasks: ${result.problem}`)
  else $.ui.status(statusLine(result))
  return result
}

const pad = (value: string | number, width: number) => String(value).padStart(width)

/** What a pane shows instead of counts, or undefined when there are counts. */
function notice(result: StatsResult): string | undefined {
  if (result === null) return 'No .memoz/tasks.json at or above this directory.'
  if ('idle' in result) return `Nothing to count: ${result.idle}.`
  if ('problem' in result) return result.problem
  return undefined
}

export const register: Register = (on, options) => {
  vaultsDir = typeof options.vaultsDir === 'string' ? options.vaultsDir.trim() : ''
  let timer: Timer | undefined

  // The session answers its directory once its own start has run, so read after `next`.
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    timer?.cancel()
    timer = $.clock.every(REFRESH_MS, () => void refresh($))
    void refresh($)
    await $.command.register({ name: 'task-stats', description: 'Show task counts for this project in a pane' })
    return result
  })

  // A turn may have changed a task's status; the minute timer would catch it later.
  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    void refresh($)
    return result
  })

  on('command.run', { command: 'task-stats' }, async $ => {
    const result = await refresh($)
    await $.ui.open({ id: PANE, title: 'Task stats' })
    const why = notice(result)
    return { text: why === undefined ? statusLine(result as TaskStats) : `Task stats: ${why}` }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const result = await read($, stats)
    const why = notice(result)
    if (why !== undefined) {
      return result !== null && 'problem' in result ? <Text color="red">{why}</Text> : <Text dimColor>{why}</Text>
    }
    const s = result as TaskStats
    const updated = new Date(s.computedAt).toTimeString().slice(0, 5)
    const rowKey = (t: { name: string; parent?: string }) => `active:${t.parent === undefined ? '' : `${t.parent} — `}${t.name}`
    if (e.surface === 'desktop' || e.surface === 'vscode' || e.surface === 'mobile') {
      const { Svg, Markdown } = $.ui.resolve(e)
      const svg = dashboardSvg(s)
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>{`${s.prefix} — ${s.vaultPath}`}</Text>
          <Text dimColor>{`updated ${updated} · refreshes every minute · /task-stats to refresh now`}</Text>
          <Svg source={svg.source} alt={dashboardAlt(s)} height={svg.height} isInteractive />
          <Markdown text={activeMarkdown(s)} />
          {otherNotesLine(s) !== undefined && <Text dimColor>{otherNotesLine(s)}</Text>}
        </Box>
      )
    }
    const width = Math.max(20, e.props.bodyColumns ?? 60)
    const fit = (line: string) => (line.length > width ? `${line.slice(0, width - 1)}…` : line)
    const cell = (counts: Record<string, number>, total: number, k: string) =>
      k === 'other' ? total - KNOWN_STATUSES.reduce((n, known) => n + (counts[known] ?? 0), 0) : (counts[k] ?? 0)
    const row = (label: string, counts: Record<string, number>, total: number) =>
      `${label.padEnd(6)}${COLUMNS.map(k => pad(cell(counts, total, k), 8)).join('')}${pad(total, 8)}`
    const all = Object.fromEntries(KNOWN_STATUSES.map(k => [k, countOf(s, k)]))
    const priorities = priorityOrder(Object.keys(s.todoByPriority))

    return (
      <Box flexDirection="column">
        <Text bold>{fit(`${s.prefix} — ${s.vaultPath}`)}</Text>
        <Text dimColor>updated {updated} · refreshes every minute · /task-stats to refresh now</Text>
        <Text> </Text>
        <Text dimColor>{`${''.padEnd(6)}${COLUMNS.map(k => pad(k, 8)).join('')}${pad('total', 8)}`}</Text>
        <Text>{row('main', s.main.byStatus, s.main.total)}</Text>
        <Text>{row('sub', s.sub.byStatus, s.sub.total)}</Text>
        <Text bold>{row('all', all, s.main.total + s.sub.total)}</Text>
        <Text> </Text>
        <Text>
          {`Done ${donePercent(s)}% of not dropped · closed last 7 days ${s.doneLast7} · last 30 days ${s.doneLast30}`}
        </Text>
        <Text>
          {`Todo by priority: ${priorities.map(p => `${priorityLabel(p)} ${s.todoByPriority[p]}`).join(' · ') || 'none'}`}
        </Text>
        {countOther(s) > 0 && <Text dimColor>{`other: statuses outside ${KNOWN_STATUSES.join(', ')}`}</Text>}
        {otherNotesLine(s) !== undefined && <Text dimColor>{otherNotesLine(s)}</Text>}
        <Text> </Text>
        <Text bold>Active</Text>
        {s.active.length === 0 && <Text dimColor>nothing in doing or review</Text>}
        {s.active.map(t => (
          <Box key={rowKey(t)}>
            <Text>{fit(`${t.status.padEnd(7)}${t.parent === undefined ? '' : `${t.parent.split(' ')[0]} / `}${t.name}`)}</Text>
          </Box>
        ))}
      </Box>
    )
  })
}
