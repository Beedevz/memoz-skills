import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { BandSnapshot, BandTask } from '../types'
import {
  HISTORY_FILE,
  bandTask,
  barRuns,
  byPriority,
  groupHistory,
  historyTimeline,
  parseHistoryFile,
  parseNote,
  resolveStalledDays,
  rowAlt,
  rowCells,
  rowLayout,
  localDay,
  type ParsedNote,
  type RunKind,
  type TaskTouchHistory,
} from './band-model'
import { desktopLayout, rowSvg } from './band-svg'

const snapshot = atom(
  { plugin: 'memoz-task-band', key: 'snapshot' } as const,
  { kind: 'none' } as BandSnapshot,
)
const hidden = atom({ plugin: 'memoz-task-band', key: 'hidden' } as const, [] as string[])

const REFRESH_MS = 30_000
// Desktop: CSS pixels per band column, measured (95 columns drew a ~768px
// band). The row's Svg leaves room for the gap and the ✕ beside it; one wider
// than its slot is scaled down, so erring wide only shrinks the row a little.
const DESKTOP_PX_PER_COLUMN = 8
const DESKTOP_HIDE_PX = 36
const STATUS_COLOR = { doing: 'warning', review: 'suggestion' } as const
const RUN_STYLE: Record<RunKind, { color?: string; dimColor?: boolean }> = {
  fill: { color: 'success' },
  'tick-fill': { color: 'success' },
  empty: { dimColor: true },
  'tick-empty': { color: 'subtle' },
}

type Declaration = { vault: string; folder: string }
type NoteFile = { path: string; id: string; mtimeMs: number; size: number }

let vaultsDir = ''
// Parsed notes by absolute path; a file is read again only when its
// mtime or size changed. Lost on reload, which costs one full read.
let cache = new Map<string, { mtimeMs: number; size: number; note: ParsedNote }>()
let running: Promise<void> | undefined

// Walks up from the session's directory to the nearest .memoz/tasks.json.
async function findDeclaration($: EngineInterface): Promise<Declaration | null> {
  let dir = (await $.session.cwd()).replace(/\/+$/, '')
  for (;;) {
    const path = `${dir}/.memoz/tasks.json`
    if (await $.fs.exists(path)) {
      const parsed: unknown = JSON.parse(await $.fs.read(path))
      if (typeof parsed !== 'object' || parsed === null) return null
      const { backend, vault, folder } = parsed as Record<string, unknown>
      if (backend !== 'vault' || typeof vault !== 'string' || vault === '') return null
      return { vault, folder: typeof folder === 'string' && folder !== '' ? folder : 'Tasks' }
    }
    if (dir === '') return null
    dir = dir.slice(0, dir.lastIndexOf('/'))
  }
}

// A vault declared by name is looked up under vaultsDir, which the person
// sets; with none set the band says so rather than guess a location.
async function vaultPath($: EngineInterface, vault: string): Promise<string | null> {
  if (vault.startsWith('/')) return vault
  if (vaultsDir === '') return null
  const home = (await $.env.get('HOME')) ?? ''
  const base = vaultsDir.replace(/^~(?=\/|$)/, home).replace(/\/+$/, '')
  return `${base}/${vault}`
}

async function listNotes($: EngineInterface, dir: string, prefix: string): Promise<NoteFile[]> {
  const found: NoteFile[] = []
  for (const entry of await $.fs.list(dir)) {
    if (entry.name.startsWith('.')) continue
    const path = `${dir}/${entry.name}`
    if (entry.kind === 'dir') {
      found.push(...(await listNotes($, path, `${prefix}${entry.name}/`)))
    } else if (entry.kind === 'file' && entry.name.endsWith('.md')) {
      const id = `${prefix}${entry.name.slice(0, -'.md'.length)}`
      found.push({ path, id, mtimeMs: entry.mtimeMs, size: entry.size })
    }
  }
  return found
}

type VaultSettings = { stalledDays: number; secretsFolder: string }

// `stalledDays` and `folders.secrets` from the vault's `.memoz/settings.json`; a missing, unreadable
// or unusable value is the default (2 days; the folder `Secrets`, the app's default).
async function readSettings($: EngineInterface, vault: string): Promise<VaultSettings> {
  const settings: VaultSettings = { stalledDays: resolveStalledDays(undefined), secretsFolder: 'Secrets' }
  const path = `${vault}/.memoz/settings.json`
  try {
    if (!(await $.fs.exists(path))) return settings
    const parsed: unknown = JSON.parse(await $.fs.read(path))
    if (typeof parsed !== 'object' || parsed === null) return settings
    const { stalledDays, folders } = parsed as Record<string, unknown>
    const secrets = typeof folders === 'object' && folders !== null ? (folders as Record<string, unknown>).secrets : undefined
    return {
      stalledDays: resolveStalledDays(stalledDays),
      secretsFolder: typeof secrets === 'string' ? secrets.trim().replace(/^\/+|\/+$/g, '') : settings.secretsFolder,
    }
  } catch {
    return settings
  }
}

// The vault's task history (`.memoz/history/*.jsonl`) by the task's vault-relative path (NFC). Each
// file is parsed again only when its mtime or size changed, and the whole is grouped again only when
// some file changed. A vault with no history, or one that cannot be read, has none: the band then
// behaves as it did before the history existed.
type HistoryFileEntry = { mtimeMs: number; size: number; events: ReturnType<typeof parseHistoryFile> }
let historyFiles = new Map<string, HistoryFileEntry>()
let historyGroups: { signature: string; byPath: Map<string, TaskTouchHistory> } | undefined

async function readHistory($: EngineInterface, vault: string, secretsFolder: string): Promise<Map<string, TaskTouchHistory>> {
  const dir = `${vault}/.memoz/history`
  try {
    if (!(await $.fs.exists(dir))) return new Map()
    const files = (await $.fs.list(dir)).filter(entry => entry.kind === 'file' && HISTORY_FILE.test(entry.name))
    const next = new Map<string, HistoryFileEntry>()
    for (const file of files) {
      const path = `${dir}/${file.name}`
      const cached = historyFiles.get(path)
      let events = cached && cached.mtimeMs === file.mtimeMs && cached.size === file.size ? cached.events : undefined
      try {
        events ??= parseHistoryFile(await $.fs.read(path))
      } catch {
        continue // unreadable now (a cloud drive may still be fetching it): skipped, NOT cached, read again on the next scan
      }
      next.set(path, { mtimeMs: file.mtimeMs, size: file.size, events })
    }
    historyFiles = next
    const signature = JSON.stringify([secretsFolder, ...[...next].map(([path, file]) => [path, file.mtimeMs, file.size])])
    if (historyGroups?.signature !== signature) {
      const grouped = groupHistory(historyTimeline([...next.values()].map(file => file.events)), secretsFolder)
      historyGroups = { signature, byPath: new Map([...grouped].map(([path, history]) => [path.normalize('NFC'), history])) }
    }
    return historyGroups.byPath
  } catch {
    return new Map()
  }
}

async function scan($: EngineInterface): Promise<BandSnapshot> {
  const declaration = await findDeclaration($)
  if (declaration === null) return { kind: 'none' }

  const vault = await vaultPath($, declaration.vault)
  if (vault === null) return { kind: 'unresolved', vault: declaration.vault }
  const root = `${vault}/${declaration.folder}`
  if (!(await $.fs.exists(root))) return { kind: 'missing', path: root }

  const { stalledDays, secretsFolder } = await readSettings($, vault)
  const history = await readHistory($, vault, secretsFolder)
  const today = localDay(await $.clock.now())
  const next = new Map<string, { mtimeMs: number; size: number; note: ParsedNote }>()
  const tasks: BandTask[] = []
  for (const file of await listNotes($, root, '')) {
    const cached = cache.get(file.path)
    const isFresh = cached && cached.mtimeMs === file.mtimeMs && cached.size === file.size
    const note = isFresh ? cached.note : parseNote(await $.fs.read(file.path))
    next.set(file.path, { mtimeMs: file.mtimeMs, size: file.size, note })
    if (note.status !== 'doing' && note.status !== 'review') continue
    const taskPath = `${declaration.folder.replace(/^\/+|\/+$/g, '')}/${file.id}.md`.normalize('NFC')
    tasks.push(bandTask(file.id, note.status, note, file.mtimeMs, today, stalledDays, history.get(taskPath)))
  }
  cache = next
  return { kind: 'tasks', tasks: tasks.sort(byPriority) }
}

// Overlapping triggers (timer, turn end) share one scan.
function refresh($: EngineInterface): Promise<void> {
  running ??= (async () => {
    let found: BandSnapshot
    try {
      found = await scan($)
    } catch (error) {
      found = { kind: 'error', message: error instanceof Error ? error.message : String(error) }
    }
    const current = await read($, snapshot)
    if (JSON.stringify(current) !== JSON.stringify(found)) await update($, snapshot, () => found)
  })().finally(() => {
    running = undefined
  })
  return running
}


export const register: Register = (on, options) => {
  vaultsDir = typeof options.vaultsDir === 'string' ? options.vaultsDir.trim() : ''
  let timer: Timer | undefined

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    timer?.cancel()
    timer = $.clock.every(REFRESH_MS, () => refresh($))
    void refresh($)
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    void refresh($)
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || e.props.maxRows < 1) return next(e)
    const found = await read($, snapshot)
    if (found.kind === 'none') return next(e)

    const { Box, Text, Button } = $.ui.resolve(e)

    if (found.kind !== 'tasks') {
      const why =
        found.kind === 'missing'
          ? `tasks folder not found: ${found.path}`
          : found.kind === 'unresolved'
            ? `set vaultsDir in /config to the folder that holds the "${found.vault}" vault`
            : found.message
      return (
        <Box>
          <Text dimColor>memoz band: {why}</Text>
        </Box>
      )
    }

    const hiddenIds = await read($, hidden)
    const tasks = found.tasks.filter(task => !hiddenIds.includes(task.id))
    // Only hidden tasks that are still doing or review count; a closed one
    // left in the list is nothing to show again.
    const hiddenCount = found.tasks.length - tasks.length
    if (tasks.length === 0 && hiddenCount === 0) return next(e)

    // The footer (overflow count, show-hidden) takes a row of its own.
    const hasFooter = hiddenCount > 0 || tasks.length > e.props.maxRows
    const shown = tasks.slice(0, Math.max(0, hasFooter ? e.props.maxRows - 1 : e.props.maxRows))
    const footer = hasFooter ? (
      <Box key="footer" flexDirection="row" gap={2}>
        {shown.length < tasks.length ? <Text dimColor>+{tasks.length - shown.length} more</Text> : null}
        {hiddenCount > 0 ? (
          <Button
            key="show-hidden"
            plain
            dimColor
            label={`${hiddenCount} hidden · show`}
            onPress={() => update($, hidden, () => [])}
          />
        ) : null}
      </Box>
    ) : null

    if (e.surface === 'desktop') {
      const { Svg } = $.ui.resolve(e)
      const width = Math.max(320, e.props.bodyColumns * DESKTOP_PX_PER_COLUMN - DESKTOP_HIDE_PX)
      const layout = desktopLayout(shown, width)
      return (
        <Box flexDirection="column">
          {shown.map(task => (
            <Box key={task.id} flexDirection="row" alignItems="center" gap={1}>
              <Svg source={rowSvg(task, width, layout)} alt={rowAlt(task)} />
              <Button
                key={`hide:${task.id}`}
                plain
                dimColor
                label="✕"
                onPress={() => update($, hidden, ids => (ids.includes(task.id) ? ids : [...ids, task.id]))}
              />
            </Box>
          ))}
          {footer}
        </Box>
      )
    }

    const layout = shown.length > 0 ? rowLayout(shown, e.props.bodyColumns) : null

    return (
      <Box flexDirection="column">
        {layout && shown.map(task => {
          const cells = rowCells(task, layout)
          return (
            <Box key={task.id} flexDirection="row">
              <Text color={task.priority === 1 ? 'error' : undefined} dimColor={task.priority !== 1}>{cells.priority}</Text>
              <Text bold>{cells.code}</Text>
              <Text>{cells.title}  </Text>
              <Text color={STATUS_COLOR[task.status]}>{cells.dots}</Text>
              <Text color={task.stage === null && task.status === 'doing' ? 'warning' : undefined}>{cells.name}  </Text>
              {barRuns(task, layout.barWidth).map((run, index) => (
                <Text key={`${task.id}:run:${index}`} {...RUN_STYLE[run.kind]}>
                  {run.text}
                </Text>
              ))}
              <Text dimColor> {cells.count}</Text>
              {layout.ageWidth > 0 ? <Text dimColor>  {cells.age}</Text> : null}
              {layout.flagWidth > 0 ? <Text color="error">  {cells.flag}</Text> : null}
              <Text>  </Text>
              <Button
                key={`hide:${task.id}`}
                plain
                dimColor
                label="✕"
                onPress={() => update($, hidden, ids => (ids.includes(task.id) ? ids : [...ids, task.id]))}
              />
            </Box>
          )
        })}
        {footer}
      </Box>
    )
  })
}
