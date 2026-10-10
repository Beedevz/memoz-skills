import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { FsEntry, On } from 'claude-code'

import { barRuns, parseNote } from '../hooks/band-model'
import { rowSvg } from '../hooks/band-svg'

const CWD = '/work/proj'
const TASKS = '/home/u/vaults/V/Tasks'

type Fixture = Map<string, { text: string; mtimeMs: number }>

const note = (frontmatter: string, body: string): string => `---\n${frontmatter}\n---\n${body}\n`

const fixture = (): Fixture =>
  new Map([
    [`${CWD}/.memoz/tasks.json`, { text: '{"backend":"vault","vault":"V","folder":"Tasks"}', mtimeMs: 1 }],
    [
      `${TASKS}/ABC-1 — alpha.md`,
      {
        text: note(
          'status: doing\nstage: agent-review\npriority: 2',
          '- [x] one\n- [ ] two\n```md\n- [x] an example, not a criterion\n```',
        ),
        mtimeMs: 1,
      },
    ],
    [`${TASKS}/ABC-2/T3 — beta.md`, { text: note('status: review\npriority: 1', 'no boxes'), mtimeMs: 1 }],
    [`${TASKS}/ABC-3 — gamma.md`, { text: note('status: todo\npriority: 1', '- [ ] x'), mtimeMs: 1 }],
  ])

// Answers the session's directory, HOME, the clock and the file system
// from the fixture, and counts reads per path.
const world = (on: On, files: Fixture) => {
  const reads = new Map<string, number>()
  const isDir = (path: string) => [...files.keys()].some(file => file.startsWith(`${path}/`))

  mock.env(on, { HOME: '/home/u' })
  const clock = mock.clock(on)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: CWD }))
  on('fs.exists', ($, e) => ({ value: files.has(e.path) || isDir(e.path) }))
  on('fs.read', ($, e) => {
    const file = files.get(e.path)
    if (!file) return { deny: `ENOENT: ${e.path}` }
    reads.set(e.path, (reads.get(e.path) ?? 0) + 1)
    return { value: file.text }
  })
  on('fs.list', ($, e) => {
    const names = new Map<string, FsEntry>()
    for (const [path, file] of files) {
      if (!path.startsWith(`${e.path}/`)) continue
      const rest = path.slice(e.path.length + 1)
      const [name, ...deeper] = rest.split('/')
      const isFile = deeper.length === 0
      names.set(name!, {
        name: name!,
        kind: isFile ? 'file' : 'dir',
        size: isFile ? file.text.length : 0,
        mtimeMs: isFile ? file.mtimeMs : 0,
        isLink: false,
      })
    }
    return { value: [...names.values()] }
  })
  return { clock, reads }
}

const start = async ($: Engine, clock: { settle: () => Promise<void> }) => {
  await $.session.start({ cwd: CWD, surface: 'terminal', isInteractive: true })
  await clock.settle()
}

type Drawing = { findAll: (query: { type: string }) => Promise<{ text: string; props: Record<string, unknown> }[]> }

// What a reader gets from the band on either surface: the terminal's Text
// runs, and the desktop's Svg rows by their alt text.
const shownText = async (ui: Drawing): Promise<string> => {
  const texts = (await ui.findAll({ type: 'Text' })).map(found => found.text)
  const alts = (await ui.findAll({ type: 'Svg' })).map(found => String(found.props.alt))
  return [...texts, ...alts].join('\n')
}

const OPTIONS = { options: { vaultsDir: '~/vaults' } }

const PROPS = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 10,
  bodyColumns: 100,
  scroll: { offset: 0, bodyRows: 10 },
  view: {},
}

for (const surface of ['terminal', 'desktop'] as const) {
  describe(`band on ${surface}`, () => {
    test('lists doing and review tasks by priority with stage and criteria', OPTIONS, async ($, on) => {
      const { clock } = world(on, fixture())
      await start($, clock)

      const ui = await $.ui.mount({ plugin: 'memoz-task-band', surface, component: 'AbovePrompt', props: PROPS })
      const texts = await shownText(ui)

      expect(texts).toContain('ABC-2/T3 — beta')
      expect(texts).toContain('review 4/4')
      expect(texts).toContain('100%')
      expect(texts).toContain('agent-review 2/4')
      expect(texts).toMatch(/1\/2.*50%/)
      expect(texts).not.toContain('gamma')
      expect(texts.indexOf('beta')).toBeLessThan(texts.indexOf('alpha'))
      if (surface === 'desktop') {
        const rows = await ui.findAll({ type: 'Svg' })
        expect(rows).toHaveLength(2)
        expect(String(rows[1]!.props.source)).toContain('agent-review')
      }
      await ui.unmount()
    })

    test('✕ hides that task for the session', OPTIONS, async ($, on) => {
      const { clock } = world(on, fixture())
      await start($, clock)

      const ui = await $.ui.mount({ plugin: 'memoz-task-band', surface, component: 'AbovePrompt', props: PROPS })
      await ui.press({ key: 'hide:ABC-1 — alpha' })

      const texts = await shownText(ui)
      expect(texts).not.toContain('alpha')
      expect(texts).toContain('beta')
      expect(await ui.find({ key: 'hide:ABC-1 — alpha' })).toBeUndefined()
      await ui.unmount()
    })

    test('show brings hidden tasks back, even when every task was hidden', OPTIONS, async ($, on) => {
      const { clock } = world(on, fixture())
      await start($, clock)

      const ui = await $.ui.mount({ plugin: 'memoz-task-band', surface, component: 'AbovePrompt', props: PROPS })
      expect(await ui.find({ key: 'show-hidden' })).toBeUndefined()

      await ui.press({ key: 'hide:ABC-1 — alpha' })
      expect((await ui.find({ key: 'show-hidden' }))?.text).toBe('1 hidden · show')

      await ui.press({ key: 'hide:ABC-2/T3 — beta' })
      expect((await ui.find({ key: 'show-hidden' }))?.text).toBe('2 hidden · show')
      expect(await shownText(ui)).not.toContain('beta')

      await ui.press({ key: 'show-hidden' })
      const texts = await shownText(ui)
      expect(texts).toContain('alpha')
      expect(texts).toContain('beta')
      expect(await ui.find({ key: 'show-hidden' })).toBeUndefined()
      await ui.unmount()
    })

    test('the timer rereads only notes whose mtime changed', OPTIONS, async ($, on) => {
      const files = fixture()
      const { clock, reads } = world(on, files)
      await start($, clock)
      expect(reads.get(`${TASKS}/ABC-1 — alpha.md`)).toBe(1)

      await clock.advance(30_000)
      expect(reads.get(`${TASKS}/ABC-1 — alpha.md`)).toBe(1)

      files.set(`${TASKS}/ABC-1 — alpha.md`, { text: note('status: done', ''), mtimeMs: 2 })
      await clock.advance(30_000)
      expect(reads.get(`${TASKS}/ABC-1 — alpha.md`)).toBe(2)
      expect(reads.get(`${TASKS}/ABC-2/T3 — beta.md`)).toBe(1)

      const ui = await $.ui.mount({ plugin: 'memoz-task-band', surface, component: 'AbovePrompt', props: PROPS })
      const texts = await shownText(ui)
      expect(texts).not.toContain('alpha')
      expect(texts).toContain('beta')
      await ui.unmount()
    })

    test('a declared vault that is not there says so', OPTIONS, async ($, on) => {
      const files = fixture()
      for (const path of [...files.keys()]) if (path.startsWith(TASKS)) files.delete(path)
      const { clock } = world(on, files)
      await start($, clock)

      const ui = await $.ui.mount({ plugin: 'memoz-task-band', surface, component: 'AbovePrompt', props: PROPS })
      expect((await ui.find({ type: 'Text', text: /tasks folder not found/ }))?.text).toContain(TASKS)
      await ui.unmount()
    })
  })
}

test('a vault named without a path and no vaultsDir asks for the setting', async ($, on) => {
  const { clock } = world(on, fixture())
  await start($, clock)

  const ui = await $.ui.mount({ plugin: 'memoz-task-band', surface: 'terminal', component: 'AbovePrompt', props: PROPS })
  expect((await ui.find({ type: 'Text', text: /set vaultsDir/ }))?.text).toContain('"V" vault')
  expect(await shownText(ui)).not.toContain('alpha')
  await ui.unmount()
})

test('a vault declared by absolute path needs no vaultsDir', async ($, on) => {
  const files = fixture()
  files.set(`${CWD}/.memoz/tasks.json`, {
    text: '{"backend":"vault","vault":"/home/u/vaults/V","folder":"Tasks"}',
    mtimeMs: 1,
  })
  const { clock } = world(on, files)
  await start($, clock)

  const ui = await $.ui.mount({ plugin: 'memoz-task-band', surface: 'terminal', component: 'AbovePrompt', props: PROPS })
  expect(await shownText(ui)).toContain('alpha')
  await ui.unmount()
})

test('parseNote counts boxes outside code fences and reads the fields', () => {
  const parsed = parseNote(
    note('status: "doing"\nstage: verified\npriority: 3', '- [x] a\n- [X] b\n- [~] c\n- [ ] d\n~~~\n- [x] e\n~~~'),
  )
  expect(parsed).toEqual({ status: 'doing', stage: 'verified', priority: 3, done: 2, total: 4 })
})

test('the bar puts a tick at each box boundary and the pill in the middle', () => {
  const task = { id: 't', status: 'doing', stage: 'implementing', priority: null, done: 1, total: 3 } as const
  const runs = barRuns(task, 60)
  const bar = runs.map(run => run.text).join('')
  expect(bar).toHaveLength(60)
  expect(bar.indexOf('[implementing 1/4]')).toBe(21)
  expect(bar.slice(0, 20)).toBe('█'.repeat(20))
  expect(bar[20]).toBe('│')
  expect(bar[40]).toBe('│')
  expect(runs.filter(run => run.kind === 'tick-empty')).toHaveLength(2)
})

test('the desktop row rides the pill on the fill edge and ticks every box boundary', () => {
  const task = { id: 'a <b> & "c"', status: 'doing', stage: 'implementing', priority: 3, done: 2, total: 5 } as const
  const source = rowSvg(task, 900)
  const number = (pattern: RegExp) => Number(pattern.exec(source)?.[1])

  const trackX = number(/<rect class="track" x="(\d+)"/)
  const trackWidth = number(/<rect class="track" x="\d+" y="\d+" width="(\d+)"/)
  const fillWidth = number(/<rect x="\d+" y="\d+" width="(\d+)" height="\d+" fill="#8B87F5" fill-opacity="\.14"/)
  const pill = /<rect x="(\d+)" y="\d+" width="(\d+)" height="\d+" rx="\d+" fill="#8B87F5"\/>/.exec(source)

  expect(fillWidth).toBe(Math.round(trackWidth * 0.4))
  expect(Number(pill?.[1]) + Number(pill?.[2])).toBe(trackX + fillWidth)
  expect((source.match(/<line /g) ?? []).length).toBe(4)
  expect(source).toContain('a &#60;b&#62; &#38; &#34;c&#34;')
  expect(source).not.toContain('<b>')
})
