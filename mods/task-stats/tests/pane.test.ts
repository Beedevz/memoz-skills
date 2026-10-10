import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { FsEntry, On } from 'claude-code'

const CWD = '/work/proj'
const TASKS = '/home/u/vaults/V/Tasks'

type Fixture = Map<string, string>

const note = (frontmatter: string): string => `---\n${frontmatter}\n---\nbody\n`

const fixture = (declaration = '{"prefix":"ABC","backend":"vault","vault":"V","folder":"Tasks"}'): Fixture =>
  new Map([
    [`${CWD}/.memoz/tasks.json`, declaration],
    [`${TASKS}/ABC-1 — alpha.md`, note('status: doing\npriority: 2')],
    [`${TASKS}/ABC-2 — beta.md`, note('status: todo\npriority: 1')],
    [`${TASKS}/ABC-3 — gamma.md`, note('status: done\ndone: 2026-10-08')],
    [`${TASKS}/ABC-1/T1 — sub.md`, note('status: review')],
    [`${TASKS}/loose.md`, note('status: todo')],
  ])

// Answers the session's directory, HOME, the clock and the file system from the fixture.
const world = (on: On, files: Fixture, cwd = CWD) => {
  const statuses: (string | undefined)[] = []
  const reads: string[] = []
  const isDir = (path: string) => [...files.keys()].some(file => file.startsWith(`${path}/`))
  mock.env(on, { HOME: '/home/u' })
  const clock = mock.clock(on)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: cwd }))
  on('ui.status', ($, e) => {
    statuses.push(e.text)
    return { value: undefined }
  })
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('fs.exists', ($, e) => ({ value: files.has(e.path) || isDir(e.path) }))
  on('fs.read', ($, e) => {
    const text = files.get(e.path)
    reads.push(e.path)
    return text === undefined ? { deny: `ENOENT: ${e.path}` } : { value: text }
  })
  on('fs.list', ($, e) => {
    const names = new Map<string, FsEntry>()
    for (const [path, text] of files) {
      if (!path.startsWith(`${e.path}/`)) continue
      const [name, ...deeper] = path.slice(e.path.length + 1).split('/')
      const isFile = deeper.length === 0
      names.set(name!, { name: name!, kind: isFile ? 'file' : 'dir', size: isFile ? text.length : 0, mtimeMs: 1, isLink: false })
    }
    return { value: [...names.values()] }
  })
  return { clock, statuses, reads }
}

const start = async ($: Engine, clock: { settle: () => Promise<void> }, cwd = CWD) => {
  await $.session.start({ cwd, surface: 'terminal', isInteractive: true })
  await clock.settle()
}

const PANE = {
  component: 'Pane' as const,
  requestId: 'memoz-task-stats',
  props: { title: 'Task stats', isFocused: false, bodyColumns: 80, placement: 'dock' as const, scroll: { offset: 0, bodyRows: 30 }, view: {} },
}

// What a reader gets from the pane on either surface: Text runs, Markdown, and the Svg's alt text.
const shown = async (ui: { findAll: (q: { type: string }) => Promise<{ text: string; props: Record<string, unknown> }[]> }) =>
  [
    ...(await ui.findAll({ type: 'Text' })).map(f => f.text),
    ...(await ui.findAll({ type: 'Markdown' })).map(f => String(f.props.text)),
    ...(await ui.findAll({ type: 'Svg' })).map(f => String(f.props.alt)),
  ].join('\n')

const OPTIONS = { options: { vaultsDir: '~/vaults' } }

for (const surface of ['terminal', 'desktop'] as const) {
  describe(`pane on ${surface}`, () => {
    test('counts main and sub-tasks under the prefix and lists doing and review', OPTIONS, async ($, on) => {
      const { clock } = world(on, fixture())
      await start($, clock)

      const ui = await $.ui.mount({ plugin: 'memoz-task-stats', surface, ...PANE })
      const text = await shown(ui)
      if (surface === 'terminal') {
        // doing review todo done dropped other total
        expect(text).toMatch(/main\s+1\s+0\s+1\s+1\s+0\s+0\s+3/)
        expect(text).toMatch(/sub\s+0\s+1\s+0\s+0\s+0\s+0\s+1/)
      } else {
        expect(text).toContain('ABC: 3 main and 1 sub-tasks; doing 1, review 1, todo 1, done 1')
        const svg = await ui.findAll({ type: 'Svg' })
        expect(String(svg[0]!.props.source)).toContain('Closed per week')
      }
      expect(text).toContain('ABC-1 — alpha')
      expect(text).toContain('T1 — sub')
      expect(text).toContain('1 root notes without the ABC- prefix')
      await ui.unmount()
    })

    test('an unset vaultsDir is reported, not counted as zero', async ($, on) => {
      const { clock } = world(on, fixture())
      await start($, clock)

      const ui = await $.ui.mount({ plugin: 'memoz-task-stats', surface, ...PANE })
      const text = await shown(ui)
      expect(text).toContain('set vaultsDir in /config to the folder that holds the "V" vault')
      expect(text).not.toMatch(/\b0 main\b|main\s+0/)
      await ui.unmount()
    })

    test('a vault named by absolute path needs no vaultsDir', async ($, on) => {
      const { clock } = world(on, fixture('{"prefix":"ABC","backend":"vault","vault":"/home/u/vaults/V"}'))
      await start($, clock)

      const ui = await $.ui.mount({ plugin: 'memoz-task-stats', surface, ...PANE })
      expect(await shown(ui)).toContain('ABC-1 — alpha')
      await ui.unmount()
    })
  })
}

describe('vault discovery and refresh', () => {
  test('a project that tracks tasks outside a vault leaves the status line empty', OPTIONS, async ($, on) => {
    const { clock, statuses } = world(on, fixture('{"prefix":"ABC","backend":"repo","taskDir":"docs/tasks"}'))
    await start($, clock)

    expect(statuses.filter(text => text !== undefined)).toEqual([])
    const ui = await $.ui.mount({ plugin: 'memoz-task-stats', surface: 'terminal', ...PANE })
    expect(await shown(ui)).toContain('not tracked in a vault')
    await ui.unmount()
  })

  test('a vault backend without a prefix is reported', OPTIONS, async ($, on) => {
    const { clock, statuses } = world(on, fixture('{"backend":"vault","vault":"V"}'))
    await start($, clock)
    expect(statuses.at(-1)).toContain('declares no prefix')
  })

  test('a tasks.json that is not an object is treated as no declaration', OPTIONS, async ($, on) => {
    const { clock, statuses } = world(on, fixture('null'))
    await start($, clock)
    expect(statuses.filter(text => text !== undefined)).toEqual([])
  })

  test('the declaration is found at the file system root too', OPTIONS, async ($, on) => {
    const files = fixture()
    files.set('/.memoz/tasks.json', files.get(`${CWD}/.memoz/tasks.json`)!)
    files.delete(`${CWD}/.memoz/tasks.json`)
    const { clock, statuses } = world(on, files)
    await start($, clock)
    expect(statuses.at(-1)).toContain('ABC 3+1 tasks')
  })

  test('hidden folders such as .trash are not read', OPTIONS, async ($, on) => {
    const files = fixture()
    files.set(`${TASKS}/.trash/ABC-9 — gone.md`, note('status: doing'))
    files.set(`${TASKS}/.ABC-8 — hidden.md`, note('status: doing'))
    const { clock, reads } = world(on, files)
    await start($, clock)
    expect(reads.filter(path => path.includes('/.trash/') || path.includes('/.ABC-'))).toEqual([])
    expect(reads.length).toBeGreaterThan(1)
  })

  test('an edit that keeps the mtime but changes the size is read again', OPTIONS, async ($, on) => {
    const files = fixture()
    const { clock, statuses } = world(on, files)
    await start($, clock)
    expect(statuses.at(-1)).toContain('todo 1 ')

    files.set(`${TASKS}/ABC-1 — alpha.md`, note('status: todo\npriority: 2\nextra: x'))
    await clock.advance(60_000)
    await clock.settle()
    expect(statuses.at(-1)).toContain('todo 2 ')
  })

  test('each active task row has its own key', OPTIONS, async ($, on) => {
    const { clock } = world(on, fixture())
    await start($, clock)
    const ui = await $.ui.mount({ plugin: 'memoz-task-stats', surface: 'terminal', ...PANE })
    expect(await ui.find({ key: 'active:ABC-1 — alpha' })).toBeDefined()
    expect(await ui.find({ key: 'active:ABC-1 — T1 — sub' })).toBeDefined()
    await ui.unmount()
  })
})
