import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { FsEntry, On } from 'claude-code'

import type { BandTask } from '../types'
import {
  ageText,
  bandTask,
  barRuns,
  daysBetween,
  displayWidth,
  flagText,
  groupHistory,
  HISTORY_FILE,
  historyTimeline,
  historyTouchDay,
  lastLogDate,
  lastTouch,
  localDay,
  parseHistoryFile,
  parseNote,
  priorityText,
  resolveStalledDays,
  rowAlt,
  rowCells,
  rowLayout,
  rowLine,
  rowWidth,
  splitGraphemes,
  stageDots,
  stageName,
  stageStep,
  taskFlags,
  truncate,
} from '../hooks/band-model'
import { desktopLayout, fitTitle, rowSvg, textWidth } from '../hooks/band-svg'
import fixture from './band-fixture'

const CWD = '/work/proj'
const VAULT = '/home/u/vaults/V'
const TASKS = `${VAULT}/Tasks`
// The shared fixture and the mod's tests agree on this "now": 2026-10-15, midday UTC.
const NOW = Date.parse('2026-10-15T12:00:00Z')
const TODAY = '2026-10-15'

// `fail`: reading the file throws (a file the drive has not fetched yet)
type Fixture = Map<string, { text: string; mtimeMs: number; fail?: boolean }>

const note = (frontmatter: string, body: string): string => `---\n${frontmatter}\n---\n${body}\n`

const fixtureFiles = (): Fixture =>
  new Map([
    [`${CWD}/.memoz/tasks.json`, { text: '{"backend":"vault","vault":"V","folder":"Tasks"}', mtimeMs: 1 }],
    [
      `${TASKS}/ABC-1 — alpha.md`,
      {
        text: note(
          'status: doing\nstage: agent-review\npriority: 2\nstart: 2026-10-12\nbranch: feat/alpha',
          '- [x] one\n- [ ] two\n```md\n- [x] an example, not a criterion\n```\n## Log\n- 2026-10-14 — a step',
        ),
        mtimeMs: 1,
      },
    ],
    [
      `${TASKS}/ABC-2/T3 — beta.md`,
      { text: note('status: review\npriority: 1', 'no boxes'), mtimeMs: Date.parse('2026-10-13T08:00:00Z') },
    ],
    [`${TASKS}/ABC-3 — gamma.md`, { text: note('status: todo\npriority: 1', '- [ ] x'), mtimeMs: 1 }],
    [
      `${TASKS}/ABC-4 — delta.md`,
      {
        text: note('status: doing\npriority: 3', '- [x] a\n- [~] b\n- [ ] c\n## Log\n- 2026-10-10 — old step'),
        mtimeMs: 1,
      },
    ],
  ])

// Answers the session's directory, HOME, the clock and the file system
// from the fixture, and counts reads per path.
const world = (on: On, files: Fixture, now = NOW) => {
  const reads = new Map<string, number>()
  const isDir = (path: string) => [...files.keys()].some(file => file.startsWith(`${path}/`))

  mock.env(on, { HOME: '/home/u' })
  const clock = mock.clock(on, { now })
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: CWD }))
  // a real file system reads `Tasks//x.md` and `./Tasks/x.md` as `Tasks/x.md`
  const clean = (path: string) => path.replaceAll(/\/(?:\.?\/)+/g, '/')
  on('fs.exists', ($, e) => ({ value: files.has(clean(e.path)) || isDir(clean(e.path)) }))
  on('fs.read', ($, e) => {
    const path = clean(e.path)
    const file = files.get(path)
    if (!file) return { deny: `ENOENT: ${e.path}` }
    reads.set(path, (reads.get(path) ?? 0) + 1)
    if (file.fail) return { deny: `EIO: ${e.path}` }
    return { value: file.text }
  })
  on('fs.list', ($, e) => {
    const names = new Map<string, FsEntry>()
    const dir = clean(e.path)
    for (const [path, file] of files) {
      if (!path.startsWith(`${dir}/`)) continue
      const rest = path.slice(dir.length + 1)
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
  bodyColumns: 120,
  scroll: { offset: 0, bodyRows: 10 },
  view: {},
}

for (const surface of ['terminal', 'desktop'] as const) {
  const mount = ($: Engine, props = PROPS) =>
    $.ui.mount({ plugin: 'memoz-task-band', surface, component: 'AbovePrompt', props })

  describe(`band on ${surface}`, () => {
    test('lists doing and review tasks by priority; stage, criteria and last step are labelled apart', OPTIONS, async ($, on) => {
      const { clock } = world(on, fixtureFiles())
      await start($, clock)

      const ui = await mount($)
      const texts = await shownText(ui)

      expect(texts).toContain('ABC-2/T3')
      expect(texts).toContain('beta')
      expect(texts).toContain('agent-review')
      expect(texts).toContain('review')
      expect(texts).not.toContain('gamma')
      expect(texts).not.toContain('%')
      expect(texts.indexOf('beta')).toBeLessThan(texts.indexOf('alpha'))
      expect(texts.indexOf('alpha')).toBeLessThan(texts.indexOf('delta'))
      if (surface === 'desktop') {
        const rows = await ui.findAll({ type: 'Svg' })
        expect(rows).toHaveLength(3)
        expect(String(rows[1]!.props.source)).toContain('agent-review')
        expect(texts).toContain('stage agent-review 2/4, criteria 1/2, last step 1d ago')
        expect(texts).toContain('stage review 4/4, no criteria, last step 2d ago (note edited)')
        expect(texts).toContain('criteria 1/3 (1 waived)')
      } else {
        expect(texts).toContain('●●○○')
        expect(texts).toContain('agent-review')
        expect(texts).toContain('●●●●')
        expect(texts).toContain('1/2')
        expect(texts).toContain('1/3')
        expect(texts).toContain('1d ago')
        expect(texts).toContain('2d ago')
        expect(texts).toContain('5d ago')
        expect(texts).toContain('P1')
      }
      await ui.unmount()
    })

    test('flags a stalled task, a missing branch or stage while doing, and a missing MR in review', OPTIONS, async ($, on) => {
      const { clock } = world(on, fixtureFiles())
      await start($, clock)

      const ui = await mount($)
      const texts = await shownText(ui)
      if (surface === 'desktop') {
        expect(texts).toContain('flags: stalled, no stage, no branch')
        expect(texts).toContain('flags: no MR')
        // alpha is a day old, has a stage and a branch: nothing to flag
        expect(texts).not.toMatch(/ABC-1 alpha[^\n]*flags/)
      } else {
        expect(texts).toContain('stalled +2')
        expect(texts).toContain('no MR')
        expect(texts).not.toContain('no branch')
      }
      await ui.unmount()
    })

    test('a quoted status is no status here either, as in the app; the case does not matter', OPTIONS, async ($, on) => {
      const files = fixtureFiles()
      files.set(`${TASKS}/ABC-5 — quoted.md`, { text: note('status: "doing"\npriority: 1', '- [ ] x'), mtimeMs: 1 })
      files.set(`${TASKS}/ABC-6 — single.md`, { text: note("status: 'review'\npriority: 1", '- [ ] x'), mtimeMs: 1 })
      files.set(`${TASKS}/ABC-7 — upper.md`, { text: note('status: Doing\npriority: 1', '- [ ] x'), mtimeMs: 1 })
      const { clock } = world(on, files)
      await start($, clock)

      const ui = await mount($)
      const texts = await shownText(ui)
      expect(texts).not.toContain('quoted')
      expect(texts).not.toContain('single')
      expect(texts).toContain('upper')
      await ui.unmount()
    })

    test('stalledDays from the vault settings moves the threshold', OPTIONS, async ($, on) => {
      const files = fixtureFiles()
      files.set(`${VAULT}/.memoz/settings.json`, { text: '{"stalledDays": 7}', mtimeMs: 1 })
      const { clock } = world(on, files)
      await start($, clock)

      const ui = await mount($)
      const texts = await shownText(ui)
      expect(texts).not.toContain('stalled')
      expect(texts).toContain(surface === 'desktop' ? 'flags: no stage, no branch' : 'no stage +1')
      await ui.unmount()
    })

    test('a settings file that is not usable falls back to two days', OPTIONS, async ($, on) => {
      const files = fixtureFiles()
      files.set(`${VAULT}/.memoz/settings.json`, { text: '{"stalledDays": "7"', mtimeMs: 1 })
      const { clock } = world(on, files)
      await start($, clock)

      const ui = await mount($)
      expect(await shownText(ui)).toContain('stalled')
      await ui.unmount()
    })

    test('✕ hides that task for the session', OPTIONS, async ($, on) => {
      const { clock } = world(on, fixtureFiles())
      await start($, clock)

      const ui = await mount($)
      await ui.press({ key: 'hide:ABC-1 — alpha' })

      const texts = await shownText(ui)
      expect(texts).not.toContain('alpha')
      expect(texts).toContain('beta')
      expect(await ui.find({ key: 'hide:ABC-1 — alpha' })).toBeUndefined()
      await ui.unmount()
    })

    test('show brings hidden tasks back, even when every task was hidden', OPTIONS, async ($, on) => {
      const { clock } = world(on, fixtureFiles())
      await start($, clock)

      const ui = await mount($)
      expect(await ui.find({ key: 'show-hidden' })).toBeUndefined()

      await ui.press({ key: 'hide:ABC-1 — alpha' })
      expect((await ui.find({ key: 'show-hidden' }))?.text).toBe('1 hidden · show')

      await ui.press({ key: 'hide:ABC-2/T3 — beta' })
      await ui.press({ key: 'hide:ABC-4 — delta' })
      expect((await ui.find({ key: 'show-hidden' }))?.text).toBe('3 hidden · show')
      expect(await shownText(ui)).not.toContain('beta')

      await ui.press({ key: 'show-hidden' })
      const texts = await shownText(ui)
      expect(texts).toContain('alpha')
      expect(texts).toContain('beta')
      expect(await ui.find({ key: 'show-hidden' })).toBeUndefined()
      await ui.unmount()
    })

    test('the timer rereads only notes whose mtime changed', OPTIONS, async ($, on) => {
      const files = fixtureFiles()
      const { clock, reads } = world(on, files)
      await start($, clock)
      expect(reads.get(`${TASKS}/ABC-1 — alpha.md`)).toBe(1)

      await clock.advance(30_000)
      expect(reads.get(`${TASKS}/ABC-1 — alpha.md`)).toBe(1)

      files.set(`${TASKS}/ABC-1 — alpha.md`, { text: note('status: done', ''), mtimeMs: 2 })
      await clock.advance(30_000)
      expect(reads.get(`${TASKS}/ABC-1 — alpha.md`)).toBe(2)
      expect(reads.get(`${TASKS}/ABC-2/T3 — beta.md`)).toBe(1)

      const ui = await mount($)
      const texts = await shownText(ui)
      expect(texts).not.toContain('alpha')
      expect(texts).toContain('beta')
      await ui.unmount()
    })

    test('ages move with the clock without rereading the notes', OPTIONS, async ($, on) => {
      const { clock, reads } = world(on, fixtureFiles())
      await start($, clock)

      const ui = await mount($)
      expect(await shownText(ui)).toContain('1d ago')

      await clock.advance(24 * 3_600_000)
      const texts = await shownText(ui)
      expect(texts).toContain('2d ago')
      expect(reads.get(`${TASKS}/ABC-1 — alpha.md`)).toBe(1)
      await ui.unmount()
    })

    test('a declared vault that is not there says so', OPTIONS, async ($, on) => {
      const files = fixtureFiles()
      for (const path of [...files.keys()]) if (path.startsWith(TASKS)) files.delete(path)
      const { clock } = world(on, files)
      await start($, clock)

      const ui = await mount($)
      expect((await ui.find({ type: 'Text', text: /tasks folder not found/ }))?.text).toContain(TASKS)
      await ui.unmount()
    })

    // ── the vault's task history: .memoz/history/*.jsonl ──

    const HISTORY = `${VAULT}/.memoz/history`
    const DELTA = 'Tasks/ABC-4 — delta.md'
    // delta: doing, last Log line 2026-10-10 → 5 days old on 2026-10-15, stalled
    const withHistory = (...events: RawEvent[]): Fixture => {
      const files = fixtureFiles()
      files.set(`${HISTORY}/2026-10.app-abcd1234.jsonl`, { text: jsonl(...events), mtimeMs: 10 })
      return files
    }
    const statusOfDelta = (day: string, id = 'e1') => event(id, T(day), DELTA, 'status', 'todo', 'doing')

    test('a doing task with an old Log line but a recent status event is not stalled', OPTIONS, async ($, on) => {
      const { clock } = world(on, withHistory(statusOfDelta('2026-10-14')))
      await start($, clock)

      const ui = await mount($)
      const texts = await shownText(ui)
      expect(texts).not.toContain('stalled')
      expect(texts).toContain('delta')
      await ui.unmount()
    })

    for (const [key, counts] of [['stage', true], ['~checkboxes', true], ['priority', false], ['~waived', false]] as const) {
      test(`a ${key} event ${counts ? 'counts' : 'does not count'} as a touch`, OPTIONS, async ($, on) => {
        const { clock } = world(on, withHistory(event('e1', T('2026-10-14'), DELTA, key, null, 'x')))
        await start($, clock)

        const ui = await mount($)
        expect((await shownText(ui)).includes('stalled')).toBe(!counts)
        await ui.unmount()
      })
    }

    test('without history files the band behaves as before, whatever else sits in the folder', OPTIONS, async ($, on) => {
      const files = fixtureFiles()
      files.set(`${HISTORY}/notes.txt`, { text: JSON.stringify(statusOfDelta('2026-10-14')), mtimeMs: 10 })
      files.set(`${HISTORY}/2026-10.app-abcd1234.jsonl.conflict`, { text: jsonl(statusOfDelta('2026-10-14')), mtimeMs: 10 })
      const { clock } = world(on, files)
      await start($, clock)

      const ui = await mount($)
      expect(await shownText(ui)).toContain('stalled')
      await ui.unmount()
    })

    test('a history file that is not readable as events is ignored', OPTIONS, async ($, on) => {
      const files = fixtureFiles()
      files.set(`${HISTORY}/2026-10.app-abcd1234.jsonl`, { text: '{"id": "x"\nnot json at all\n', mtimeMs: 10 })
      const { clock } = world(on, files)
      await start($, clock)

      const ui = await mount($)
      expect(await shownText(ui)).toContain('stalled')
      await ui.unmount()
    })

    test('the history of a task that was moved counts at its new path', OPTIONS, async ($, on) => {
      const { clock } = world(
        on,
        withHistory(
          event('e1', T('2026-10-14'), 'Tasks/old-name.md', 'status', 'todo', 'doing'),
          event('e2', T('2026-10-14', '13:00:00'), DELTA, 'path', 'Tasks/old-name.md', DELTA),
        ),
      )
      await start($, clock)

      const ui = await mount($)
      expect(await shownText(ui)).not.toContain('stalled')
      await ui.unmount()
    })

    test('the history of another task does not count', OPTIONS, async ($, on) => {
      const { clock } = world(on, withHistory(event('e1', T('2026-10-14'), 'Tasks/ABC-9 — other.md', 'status', 'todo', 'doing')))
      await start($, clock)

      const ui = await mount($)
      expect(await shownText(ui)).toContain('stalled')
      await ui.unmount()
    })

    test("a user's own `path:` field written by an older writer neither moves nor deletes the task", OPTIONS, async ($, on) => {
      const { clock } = world(
        on,
        withHistory(
          statusOfDelta('2026-10-14'),
          event('e2', T('2026-10-14', '13:00:00'), DELTA, 'path', 'a/b', null),
          event('e3', T('2026-10-14', '14:00:00'), DELTA, 'path', 'c/d', 'e/f'),
        ),
      )
      await start($, clock)

      const ui = await mount($)
      expect(await shownText(ui)).not.toContain('stalled')
      await ui.unmount()
    })

    test('the history of a deleted task counts for nothing', OPTIONS, async ($, on) => {
      const { clock } = world(
        on,
        withHistory(statusOfDelta('2026-10-14'), event('e2', T('2026-10-14', '13:00:00'), DELTA, 'path', DELTA, null)),
      )
      await start($, clock)

      const ui = await mount($)
      expect(await shownText(ui)).toContain('stalled')
      await ui.unmount()
    })

    test('the secrets folder comes from the vault settings: history under it is left out', OPTIONS, async ($, on) => {
      const files = withHistory(statusOfDelta('2026-10-14'))
      files.set(`${VAULT}/.memoz/settings.json`, { text: '{"folders": {"secrets": "/Tasks/"}}', mtimeMs: 1 })
      const { clock } = world(on, files)
      await start($, clock)

      const ui = await mount($)
      expect(await shownText(ui)).toContain('stalled')
      await ui.unmount()
    })

    test('without a settings file the folder Secrets is left out: what happened there is not shown after a move out', OPTIONS, async ($, on) => {
      const { clock } = world(
        on,
        withHistory(
          event('e1', T('2026-10-14', '08:00:00'), 'Secrets/ABC-4 — delta.md', 'status', 'todo', 'doing'),
          event('e2', T('2026-10-14'), DELTA, 'path', 'Secrets/ABC-4 — delta.md', DELTA),
        ),
      )
      await start($, clock)

      const ui = await mount($)
      expect(await shownText(ui)).toContain('stalled')
      await ui.unmount()
    })

    test('a change of the secrets folder in the settings regroups the history on the next refresh', OPTIONS, async ($, on) => {
      const files = withHistory(statusOfDelta('2026-10-14'))
      const { clock } = world(on, files)
      await start($, clock)
      const ui = await mount($)
      expect(await shownText(ui)).not.toContain('stalled')

      files.set(`${VAULT}/.memoz/settings.json`, { text: '{"folders": {"secrets": "Tasks"}}', mtimeMs: 2 })
      await clock.advance(30_000)
      expect(await shownText(ui)).toContain('stalled')
      await ui.unmount()
    })

    for (const [what, file, recorded] of [
      ['a decomposed file name', 'ABC-4 — de\u0301lta.md', 'Tasks/ABC-4 — d\u00e9lta.md'],
      ['a decomposed history path', 'ABC-4 — d\u00e9lta.md', 'Tasks/ABC-4 — de\u0301lta.md'],
    ] as const) {
      test(`${what} still finds the task's history`, OPTIONS, async ($, on) => {
        const files = withHistory(event('e1', T('2026-10-14'), recorded, 'status', 'todo', 'doing'))
        files.delete(`${TASKS}/ABC-4 — delta.md`)
        files.set(`${TASKS}/${file}`, {
          text: note('status: doing\npriority: 3', '- [x] a\n## Log\n- 2026-10-10 — old step'),
          mtimeMs: 1,
        })
        const { clock } = world(on, files)
        await start($, clock)

        const ui = await mount($)
        expect(await shownText(ui)).not.toContain('stalled')
        await ui.unmount()
      })
    }

    test('events of one task path in two Unicode forms are all counted (the NFD ones are not a second task)', OPTIONS, async ($, on) => {
      const files = withHistory(
        event('e1', T('2026-10-10'), 'Tasks/ABC-4 — d\u00e9lta.md', 'status', 'todo', 'doing'),
        event('e2', T('2026-10-12'), 'Tasks/ABC-4 — de\u0301lta.md', 'stage', null, 'implementing'),
        event('e3', T('2026-10-14'), 'Tasks/ABC-4 — d\u00e9lta.md', '~checkboxes', '0/1', '1/1'),
      )
      files.delete(`${TASKS}/ABC-4 — delta.md`)
      files.set(`${TASKS}/ABC-4 — d\u00e9lta.md`, {
        text: note('status: doing\npriority: 3', '- [x] a\n## Log\n- 2026-10-10 — old step'),
        mtimeMs: 1,
      })
      const { clock } = world(on, files)
      await start($, clock)

      const ui = await mount($)
      expect(await shownText(ui)).not.toContain('stalled')
      await ui.unmount()
    })

    test('a settings file without a secrets folder leaves the default, Secrets', OPTIONS, async ($, on) => {
      const files = withHistory(statusOfDelta('2026-10-14'))
      files.set(`${VAULT}/.memoz/settings.json`, { text: '{"stalledDays": 2, "folders": {"daily": "Daily"}}', mtimeMs: 1 })
      const { clock } = world(on, files)
      await start($, clock)

      const ui = await mount($)
      expect(await shownText(ui)).not.toContain('stalled')
      await ui.unmount()
    })

    test('the timer rereads a history file only when it changed, and a new event is picked up', OPTIONS, async ($, on) => {
      const files = withHistory(statusOfDelta('2026-10-01'))
      const { clock, reads } = world(on, files)
      await start($, clock)
      const file = `${HISTORY}/2026-10.app-abcd1234.jsonl`
      expect(reads.get(file)).toBe(1)

      await clock.advance(30_000)
      expect(reads.get(file)).toBe(1)

      files.set(file, { text: jsonl(statusOfDelta('2026-10-01'), statusOfDelta('2026-10-14', 'e2')), mtimeMs: 11 })
      await clock.advance(30_000)
      expect(reads.get(file)).toBe(2)

      const ui = await mount($)
      expect(await shownText(ui)).not.toContain('stalled')
      await ui.unmount()
    })

    // `today` is the local day. alpha (ABC-1): Log 2026-10-14, start 2026-10-12, stalled at 2 days; delta is taken out.
    const alphaOnly = (): Fixture => {
      const files = fixtureFiles()
      files.delete(`${TASKS}/ABC-4 — delta.md`)
      return files
    }

    test('today is the local day: 00:30 on the 16th is the 16th, so alpha (last step the 14th) is stalled', OPTIONS, async ($, on) => {
      const { clock } = world(on, alphaOnly(), localInstant(16, 0, 30))
      await start($, clock)

      const ui = await mount($)
      expect(await shownText(ui)).toContain('stalled')
      await ui.unmount()
    })

    test('today is the local day: 23:30 on the 15th is the 15th, so alpha (last step the 14th) is not stalled', OPTIONS, async ($, on) => {
      const { clock } = world(on, alphaOnly(), localInstant(15, 23, 30))
      await start($, clock)

      const ui = await mount($)
      const texts = await shownText(ui)
      expect(texts).toContain('alpha')
      expect(texts).not.toContain('stalled')
      await ui.unmount()
    })

    // delta: last Log line the 10th. An event at 00:30 or 23:30 local on the 14th is the 14th, one day old on the 15th.
    for (const [hour, minute] of [[0, 30], [23, 30]] as const) {
      test(`a history event at ${hour}:${minute} local counts on its local day`, OPTIONS, async ($, on) => {
        const { clock } = world(
          on,
          withHistory(event('e1', iso(localInstant(14, hour, minute)), DELTA, 'status', 'todo', 'doing')),
          localInstant(15, 12, 0),
        )
        await start($, clock)

        const ui = await mount($)
        const texts = await shownText(ui)
        expect(texts).not.toContain('stalled')
        expect(texts).toContain(surface === 'desktop' ? 'last step 1d ago' : '1d ago')
        await ui.unmount()
      })
    }

    test('a history file whose read fails is skipped, not remembered: it is read again on the next refresh', OPTIONS, async ($, on) => {
      const file = `${HISTORY}/2026-10.app-abcd1234.jsonl`
      const files = withHistory(statusOfDelta('2026-10-14'))
      const text = files.get(file)!.text
      files.set(file, { text, mtimeMs: 10, fail: true })
      const { clock } = world(on, files)
      await start($, clock)
      const ui = await mount($)
      expect(await shownText(ui)).toContain('stalled')

      files.set(file, { text, mtimeMs: 10 }) // same mtime and size: the drive has fetched it
      await clock.advance(30_000)
      expect(await shownText(ui)).not.toContain('stalled')
      await ui.unmount()
    })

    test('a history file that cannot be read after it was read keeps what was read before, and is read again', OPTIONS, async ($, on) => {
      const file = `${HISTORY}/2026-10.app-abcd1234.jsonl`
      const files = withHistory(statusOfDelta('2026-10-14'))
      const { clock, reads } = world(on, files)
      await start($, clock)
      const ui = await mount($)
      expect(await shownText(ui)).not.toContain('stalled')

      files.set(file, { text: jsonl(statusOfDelta('2026-10-01')), mtimeMs: 11, fail: true }) // changed, and the drive has not fetched it
      await clock.advance(30_000)
      expect(await shownText(ui)).not.toContain('stalled')

      files.set(file, { text: jsonl(statusOfDelta('2026-10-01')), mtimeMs: 11 }) // fetched: the new content is read
      await clock.advance(30_000)
      expect(reads.get(file)).toBe(3)
      expect(await shownText(ui)).toContain('stalled')
      await ui.unmount()
    })

    test('a tasks folder declared with a trailing slash still finds the history', OPTIONS, async ($, on) => {
      const files = withHistory(statusOfDelta('2026-10-14'))
      files.set(`${CWD}/.memoz/tasks.json`, { text: '{"backend":"vault","vault":"V","folder":"Tasks/"}', mtimeMs: 1 })
      const { clock } = world(on, files)
      await start($, clock)

      const ui = await mount($)
      const texts = await shownText(ui)
      expect(texts).toContain('delta')
      expect(texts).not.toContain('stalled')
      await ui.unmount()
    })

    for (const folder of ['./Tasks', './/Tasks/', '/Tasks']) {
      test(`a tasks folder declared as ${folder} still finds the history`, OPTIONS, async ($, on) => {
        const files = withHistory(statusOfDelta('2026-10-14'))
        files.set(`${CWD}/.memoz/tasks.json`, { text: JSON.stringify({ backend: 'vault', vault: 'V', folder }), mtimeMs: 1 })
        const { clock } = world(on, files)
        await start($, clock)

        const ui = await mount($)
        const texts = await shownText(ui)
        expect(texts).toContain('delta')
        expect(texts).not.toContain('stalled')
        await ui.unmount()
      })
    }

    test('a history event shows as the last step, in days', OPTIONS, async ($, on) => {
      const { clock } = world(on, withHistory(statusOfDelta('2026-10-13')))
      await start($, clock)

      const ui = await mount($)
      const texts = await shownText(ui)
      expect(texts).toContain(surface === 'desktop' ? 'last step 2d ago' : '2d ago')
      expect(texts).not.toContain('5d ago')
      await ui.unmount()
    })
  })
}

test('a vault named without a path and no vaultsDir asks for the setting', async ($, on) => {
  const { clock } = world(on, fixtureFiles())
  await start($, clock)

  const ui = await $.ui.mount({ plugin: 'memoz-task-band', surface: 'terminal', component: 'AbovePrompt', props: PROPS })
  expect((await ui.find({ type: 'Text', text: /set vaultsDir/ }))?.text).toContain('"V" vault')
  expect(await shownText(ui)).not.toContain('alpha')
  await ui.unmount()
})

test('a vault declared by absolute path needs no vaultsDir', async ($, on) => {
  const files = fixtureFiles()
  files.set(`${CWD}/.memoz/tasks.json`, {
    text: `{"backend":"vault","vault":"${VAULT}","folder":"Tasks"}`,
    mtimeMs: 1,
  })
  const { clock } = world(on, files)
  await start($, clock)

  const ui = await $.ui.mount({ plugin: 'memoz-task-band', surface: 'terminal', component: 'AbovePrompt', props: PROPS })
  expect(await shownText(ui)).toContain('alpha')
  await ui.unmount()
})

// ── the shared fixture: the band counts boxes and reads the Log the way the app does ──

const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone

describe('shared fixture (tests/band-fixture.ts, the Memoz app keeps a copy)', () => {
  test('has cases to run', () => {
    expect(fixture.boxCases.length).toBeGreaterThan(0)
    expect(fixture.logCases.length).toBeGreaterThan(0)
    expect(fixture.touchCases.length).toBeGreaterThan(0)
    expect(fixture.historyCases.length).toBeGreaterThan(0)
    expect(fixture.timelineCases.length).toBeGreaterThan(0)
    expect(fixture.fieldCases.length).toBeGreaterThan(0)
  })

  for (const { name, note: text, expected } of fixture.boxCases) {
    test(`boxes: ${name}`, () => {
      const parsed = parseNote(text)
      expect({ done: parsed.done, open: parsed.open, waived: parsed.waived }).toEqual(expected)
    })
  }

  for (const { name, note: text, expected } of fixture.logCases) {
    test(`log: ${name}`, () => {
      expect(parseNote(text).lastLog).toBe(expected)
    })
  }

  for (const { name, note: text, expected } of fixture.fieldCases) {
    test(`fields: ${name}`, () => {
      const parsed = parseNote(text)
      expect({
        status: parsed.status,
        start: parsed.start,
        stage: parsed.stage,
        hasBranch: parsed.hasBranch,
        hasMr: parsed.hasMr,
      }).toEqual(expected)
    })
  }

  // A mod test cannot set the time zone (no `process`): a case with a `zone` runs when the device is in
  // that zone, so the suite is run in each zone it names (TZ=Europe/Istanbul, TZ=America/New_York).
  const here = (zone: string | undefined): boolean => zone === undefined || zone === deviceZone

  for (const { name, note: text, modifiedAt, today, expected } of fixture.touchCases.filter(c => here(c.zone))) {
    test(`last touch: ${name}`, () => {
      const touch = lastTouch(parseNote(text), modifiedAt === null ? 0 : Date.parse(modifiedAt))
      const got = touch && { day: touch.day, source: touch.source, ageDays: daysBetween(touch.day, today) }
      expect(got ?? null).toEqual(expected)
    })
  }

  for (const { name, note: text, modifiedAt, today, history, expected } of fixture.historyCases.filter(c => here(c.zone))) {
    test(`last touch with history: ${name}`, () => {
      const touch = lastTouch(parseNote(text), modifiedAt === null ? 0 : Date.parse(modifiedAt), history)
      const got = touch && { day: touch.day, source: touch.source, ageDays: daysBetween(touch.day, today) }
      expect(got ?? null).toEqual(expected)
    })
  }

  // Raw events of the history files in, per task path { touchDay, deleted } out: the app's reader is held to the same cases.
  for (const { name, files, secretsFolder, expected } of fixture.timelineCases.filter(c => here(c.zone))) {
    test(`history reader: ${name}`, () => {
      const groups = groupHistory(historyTimeline(files.map(file => parseHistoryFile(jsonl(...file)))), secretsFolder ?? 'Secrets')
      const got = Object.fromEntries([...groups].map(([path, task]) => [path, { touchDay: historyTouchDay(task), deleted: task.deleted === true }]))
      expect(got).toEqual(expected)
    })
  }
})

test('the Log reader is also reachable on a bare body', () => {
  expect(lastLogDate('## Log\n- 2026-10-02 — a\n')).toBe('2026-10-02')
  expect(lastLogDate('')).toBeNull()
})

// ── the task's change history ────────────────────────────────────────────

type RawEvent = { id: string; t: string; path: string; key: string; old: unknown; new: unknown; writer: string }
const event = (
  id: string,
  t: string,
  path: string,
  key: string,
  from: unknown,
  to: unknown,
  writer = 'app',
): RawEvent => ({ id, t, path, key, old: from, new: to, writer })
const jsonl = (...events: RawEvent[]): string => `${events.map(e => JSON.stringify(e)).join('\n')}\n`
const T = (day: string, time = '12:00:00') => `${day}T${time}.000Z`
// What the band does with the files of a history: one timeline, grouped by the task's current path.
const grouped = (events: RawEvent[], secrets = 'Secrets') =>
  groupHistory(historyTimeline([parseHistoryFile(jsonl(...events))]), secrets)
const keysOf = (events: readonly { key: string }[] | undefined) => (events ?? []).map(e => e.key)

test('historyTouchDay: only status, stage and ~checkboxes count; the last one decides; a deleted task counts for nothing', () => {
  const at = (key: string, writer = 'app') => ({ t: T('2026-10-14'), key, writer })
  for (const key of ['status', 'stage', '~checkboxes']) expect(historyTouchDay({ events: [at(key)] }), key).toBe('2026-10-14')
  for (const key of ['priority', 'path', '~waived', 'title', 'start', 'branch', '']) {
    expect(historyTouchDay({ events: [at(key)] }), key).toBeNull()
  }
  const events = [{ t: T('2026-10-11'), key: 'status' }, { t: T('2026-10-13'), key: 'stage' }, at('priority')]
  expect(historyTouchDay({ events })).toBe('2026-10-13')
  expect(historyTouchDay({ events, deleted: true })).toBeNull()
  expect(historyTouchDay({ events: [] })).toBeNull()
})

test('historyTouchDay: a backfill event is its stamp day, an invalid one and a bad time are none', () => {
  expect(historyTouchDay({ events: [{ t: '2026-10-11T00:00:00.000Z', key: 'status', writer: 'backfill' }] })).toBe('2026-10-11')
  expect(historyTouchDay({ events: [{ t: '2026-02-30T00:00:00.000Z', key: 'status', writer: 'backfill' }] })).toBeNull()
  expect(historyTouchDay({ events: [{ t: 'garbage', key: 'status' }] })).toBeNull()
})

// ── local days ──
// A mod test cannot change the device's time zone (no `process`), so these build the instant FROM local
// clock parts: 01:30 and 23:30 on the 13th are, in any zone but UTC, on another UTC date (east of UTC the
// early one, west of it the late one). The expected day is the local one by construction. Run the suite in two
// zones: `TZ=Europe/Istanbul` and `TZ=America/New_York` (in UTC itself nothing here can tell local from UTC).
const localInstant = (day: number, hour: number, minute: number, month = 10): number =>
  new Date(2026, month - 1, day, hour, minute).getTime()
const iso = (ms: number): string => new Date(ms).toISOString()

test("historyTouchDay: an event's day is the local day of its time; a backfill stamp stays its own day", () => {
  for (const [hour, minute] of [[0, 30], [1, 30], [12, 0], [22, 0], [23, 30]] as const) {
    const t = iso(localInstant(13, hour, minute))
    expect(historyTouchDay({ events: [{ t, key: 'status', writer: 'app' }] }), t).toBe('2026-10-13')
  }
  expect(historyTouchDay({ events: [{ t: '2026-10-11T00:00:00.000Z', key: 'status', writer: 'backfill' }] })).toBe('2026-10-11')
})

test('localDay: the calendar day of an instant in the device zone', () => {
  expect(localDay(localInstant(16, 0, 30))).toBe('2026-10-16')
  expect(localDay(localInstant(15, 23, 30))).toBe('2026-10-15')
  expect(localDay(localInstant(1, 12, 0, 12))).toBe('2026-12-01')
})

test('a history file name is month, kind and an 8-character id', () => {
  expect(HISTORY_FILE.test('2026-10.app-abcd1234.jsonl')).toBe(true)
  expect(HISTORY_FILE.test('2026-10.external-abcd1234.jsonl')).toBe(true)
  for (const name of ['x.jsonl', '2026-10.app.jsonl', '2026-10.app-ABCD1234.jsonl', '2026-10.app-abcd123.jsonl', '2026-10.app-abcd1234.json']) {
    expect(HISTORY_FILE.test(name), name).toBe(false)
  }
})

test('a history file is read line by line: a line that is not a well-formed event is skipped', () => {
  const good = event('a', T('2026-10-14'), 'Tasks/x.md', 'status', 'todo', 'doing')
  const text = [
    JSON.stringify(good),
    '',
    'not json',
    '[1,2]',
    'null',
    JSON.stringify({ ...good, id: 1 }),
    JSON.stringify({ ...good, id: 'b', writer: 'someone' }),
    JSON.stringify({ ...good, id: 'c', t: '2026-10-14T12:00:00Z' }),
    JSON.stringify({ ...good, id: 'd', t: '2026-02-30T12:00:00.000Z' }),
    JSON.stringify({ ...good, id: 'e', old: 5 }),
    JSON.stringify({ ...good, id: 'f', new: ['a', 1] }),
    JSON.stringify({ ...good, id: 'g', key: undefined }),
    JSON.stringify({ ...good, id: 'h', new: ['a', 'b'] }),
  ].join('\n')
  expect(parseHistoryFile(text).map(e => e.id)).toEqual(['a', 'h'])
  expect(parseHistoryFile('')).toEqual([])
})

test('the timeline keeps one event per id, the best writer\'s, in time order', () => {
  const app = event('1', T('2026-10-14'), 'Tasks/x.md', 'status', 'todo', 'doing', 'app')
  const observed = { ...app, writer: 'external' }
  const earlier = event('2', T('2026-10-13'), 'Tasks/x.md', 'stage', null, 'implementing', 'cli')
  for (const files of [[[observed], [app, earlier]], [[app, earlier], [observed]]]) {
    const timeline = historyTimeline(files.map(file => parseHistoryFile(jsonl(...file))))
    expect(timeline.map(e => [e.id, e.writer])).toEqual([['2', 'cli'], ['1', 'app']])
  }
})

test('at an equal time the writer\'s own event comes before an observer\'s, then path order', () => {
  const t = T('2026-10-14')
  const timeline = historyTimeline([
    parseHistoryFile(
      jsonl(
        event('o', t, 'Tasks/a.md', 'status', 'todo', 'doing', 'external'),
        event('b', t, 'Tasks/b.md', 'status', 'todo', 'doing', 'app'),
        event('a', t, 'Tasks/a.md', 'stage', null, 'x', 'app'),
      ),
    ),
  ])
  expect(timeline.map(e => e.id)).toEqual(['a', 'b', 'o'])
})

test('the timeline drops an external repeat of a value already reached, and a backfill guess a real event reached', () => {
  const timeline = historyTimeline([
    parseHistoryFile(
      jsonl(
        event('1', T('2026-10-10'), 'Tasks/x.md', 'status', 'todo', 'doing', 'app'),
        event('2', T('2026-10-12'), 'Tasks/x.md', 'status', 'doing', 'review', 'app'),
        event('3', T('2026-10-14'), 'Tasks/x.md', 'status', 'doing', 'review', 'external'), // re-recorded at a later edit
        event('4', T('2026-10-14'), 'Tasks/x.md', 'status', 'review', 'done', 'external'), // a real change an observer saw
        event('5', '2026-10-10T00:00:00.000Z', 'Tasks/x.md', 'status', null, 'doing', 'backfill'), // the stamp the app already wrote
        event('6', '2026-10-01T00:00:00.000Z', 'Tasks/y.md', 'status', null, 'doing', 'backfill'), // nothing else knows it
      ),
    ),
  ])
  expect(timeline.map(e => e.id)).toEqual(['6', '1', '2', '4'])
})

test('an external event is kept when it is the first for its key', () => {
  const timeline = historyTimeline([parseHistoryFile(jsonl(event('1', T('2026-10-14'), 'Tasks/x.md', 'status', 'todo', 'doing', 'external')))])
  expect(timeline.map(e => e.id)).toEqual(['1'])
})

test('grouping: events by path; a move carries the task\'s events to its new path', () => {
  const groups = grouped([
    event('1', T('2026-10-10'), 'Tasks/a.md', 'status', 'todo', 'doing'),
    event('2', T('2026-10-11'), 'Tasks/b.md', 'stage', null, 'implementing'),
    event('3', T('2026-10-12'), 'Tasks/sub/a.md', 'path', 'Tasks/a.md', 'Tasks/sub/a.md'),
    event('4', T('2026-10-13'), 'Tasks/sub/a.md', '~checkboxes', '0/1', '1/1'),
  ])
  expect([...groups.keys()].sort()).toEqual(['Tasks/b.md', 'Tasks/sub/a.md'])
  expect(keysOf(groups.get('Tasks/sub/a.md')?.events)).toEqual(['status', 'path', '~checkboxes'])
  expect(historyTouchDay(groups.get('Tasks/sub/a.md')!)).toBe('2026-10-13')
  expect(historyTouchDay(groups.get('Tasks/b.md')!)).toBe('2026-10-11')
})

test('grouping: a delete marks the task, a restore clears the mark and keeps its events', () => {
  const del = event('2', T('2026-10-12'), 'Tasks/a.md', 'path', 'Tasks/a.md', null)
  const events = [event('1', T('2026-10-10'), 'Tasks/a.md', 'status', 'todo', 'doing'), del]
  expect(grouped(events).get('Tasks/a.md')?.deleted).toBe(true)
  expect(historyTouchDay(grouped(events).get('Tasks/a.md')!)).toBeNull()
  const restored = grouped([...events, event('3', T('2026-10-13'), 'Tasks/a.md', 'path', null, 'Tasks/a.md')]).get('Tasks/a.md')
  expect(restored?.deleted).toBe(false)
  expect(historyTouchDay(restored!)).toBe('2026-10-10')
})

test('grouping: a user\'s own `path:` field recorded by an older writer (key path, the note\'s own path) is a field change, not a move', () => {
  const group = grouped([
    event('1', T('2026-10-10'), 'Tasks/a.md', 'status', 'todo', 'doing'),
    event('2', T('2026-10-11'), 'Tasks/a.md', 'path', 'old/value', 'new/value'), // not a move: the path is the note's own
  ])
  expect([...group.keys()]).toEqual(['Tasks/a.md'])
  expect(keysOf(group.get('Tasks/a.md')?.events)).toEqual(['status', 'path'])
  expect(group.get('Tasks/a.md')?.deleted).toBe(false)
  expect(historyTouchDay(group.get('Tasks/a.md')!)).toBe('2026-10-10')
})

test('grouping: a user\'s `path:` field whose old value names the secrets folder is still a field change', () => {
  const group = grouped([
    event('1', T('2026-10-10'), 'Tasks/a.md', 'status', 'todo', 'doing'),
    event('2', T('2026-10-11'), 'Tasks/a.md', 'path', 'Secrets/z', 'elsewhere'),
  ]).get('Tasks/a.md')
  expect(group?.events.map(e => e.id)).toEqual(['1', '2'])
})

test('grouping: removing the user\'s `path:` field (new null, the note\'s own path) is not a delete', () => {
  const group = grouped([
    event('1', T('2026-10-10'), 'Tasks/a.md', 'status', 'todo', 'doing'),
    event('2', T('2026-10-11'), 'Tasks/a.md', 'path', 'old/value', null),
  ]).get('Tasks/a.md')
  expect(group?.deleted).toBe(false)
  expect(keysOf(group?.events)).toEqual(['status', 'path'])
  expect(historyTouchDay(group!)).toBe('2026-10-10')
})

test('grouping: a user\'s `path:` field event at a deleted task\'s path is another task and starts a fresh group', () => {
  const group = grouped([
    event('1', T('2026-10-10'), 'Tasks/a.md', 'status', 'todo', 'doing'),
    event('2', T('2026-10-11'), 'Tasks/a.md', 'path', 'Tasks/a.md', null), // deleted
    event('3', T('2026-10-12'), 'Tasks/a.md', 'path', 'x', 'y'), // a user field on a task created there
  ]).get('Tasks/a.md')
  expect(group?.events.map(e => e.id)).toEqual(['3'])
  expect(group?.deleted).toBe(false)
})

test('grouping: the same shapes are genuine when the path is the new (move, restore) or the old (delete) path', () => {
  const moved = grouped([
    event('1', T('2026-10-10'), 'Tasks/a.md', 'status', 'todo', 'doing'),
    event('2', T('2026-10-11'), 'Tasks/b.md', 'path', 'Tasks/a.md', 'Tasks/b.md'),
  ])
  expect([...moved.keys()]).toEqual(['Tasks/b.md'])
  const deleted = grouped([
    event('1', T('2026-10-10'), 'Tasks/a.md', 'status', 'todo', 'doing'),
    event('2', T('2026-10-11'), 'Tasks/a.md', 'path', 'Tasks/a.md', null),
  ])
  expect(deleted.get('Tasks/a.md')?.deleted).toBe(true)
})

test('grouping: a user\'s `path:` field event stays a field event beside a real move of the same time', () => {
  const t = T('2026-10-14')
  // the user field event and a real move share a time; the field event stays a field event (before the move)
  const events = [
    event('1', T('2026-10-10'), 'Tasks/x.md', 'status', 'todo', 'doing'),
    event('2', t, 'Tasks/x.md', 'path', 'one', 'two'),
    event('3', t, 'Archive/x.md', 'path', 'Tasks/x.md', 'Archive/x.md'),
  ]
  const groups = grouped(events)
  expect([...groups.keys()]).toEqual(['Archive/x.md'])
  expect(keysOf(groups.get('Archive/x.md')?.events)).toEqual(['status', 'path', 'path'])
  expect(groups.get('Archive/x.md')?.events.map(e => e.id)).toEqual(['1', '2', '3'])
})

test('grouping: an escaped user key (`~key:path`) is a plain field change', () => {
  const group = grouped([
    event('1', T('2026-10-10'), 'Tasks/a.md', 'status', 'todo', 'doing'),
    event('2', T('2026-10-11'), 'Tasks/a.md', '~key:path', 'x', 'y'),
    event('3', T('2026-10-12'), 'Tasks/a.md', '~key:path', 'y', null),
  ]).get('Tasks/a.md')
  expect(group?.deleted).toBe(false)
  expect(keysOf(group?.events)).toEqual(['status', '~key:path', '~key:path'])
  expect(historyTouchDay(group!)).toBe('2026-10-10') // a user field is not work on the task
  // even a value that looks like a delete (the note's own path as old, new null) is a field change under the escaped key
  const lookalike = grouped([
    event('1', T('2026-10-10'), 'Tasks/a.md', 'status', 'todo', 'doing'),
    event('2', T('2026-10-11'), 'Tasks/a.md', '~key:path', 'Tasks/a.md', null),
  ]).get('Tasks/a.md')
  expect(lookalike?.deleted).toBe(false)
  // and after a delete it is a field event at a deleted task's path: another task, a fresh group
  const fresh = grouped([
    event('1', T('2026-10-10'), 'Tasks/a.md', 'status', 'todo', 'doing'),
    event('2', T('2026-10-11'), 'Tasks/a.md', 'path', 'Tasks/a.md', null),
    event('3', T('2026-10-12'), 'Tasks/a.md', '~key:path', 'x', 'y'),
  ]).get('Tasks/a.md')
  expect(fresh?.events.map(e => e.id)).toEqual(['3'])
  expect(fresh?.deleted).toBe(false)
})

test('grouping: a field event at a deleted task\'s path is another task and starts a fresh group', () => {
  const group = grouped([
    event('1', T('2026-10-01'), 'Tasks/a.md', 'status', 'todo', 'doing'),
    event('2', T('2026-10-02'), 'Tasks/a.md', 'path', 'Tasks/a.md', null),
    event('3', T('2026-10-11'), 'Tasks/a.md', 'status', null, 'todo'),
  ]).get('Tasks/a.md')
  expect(group).toMatchObject({ deleted: false })
  expect(group?.events.map(e => e.id)).toEqual(['3'])
})

test('grouping: a moved task never inherits the group the destination had', () => {
  const group = grouped([
    event('1', T('2026-10-01'), 'Tasks/a.md', 'status', 'todo', 'doing'), // task X
    event('2', T('2026-10-02'), 'Tasks/a.md', 'path', 'Tasks/a.md', null), // X deleted
    event('3', T('2026-10-11'), 'Tasks/a.md', 'path', 'Inbox/y.md', 'Tasks/a.md'), // Y moved there, no events of its own
  ]).get('Tasks/a.md')
  expect(group?.events.map(e => e.id)).toEqual(['3'])
  expect(group?.deleted).toBe(false)
  expect(historyTouchDay(group!)).toBeNull()
})

test('grouping: at an equal time a field change comes before a move, so it stays with the moved task', () => {
  const t = T('2026-10-14')
  // The move's path sorts before the change's path: the timeline puts the move first.
  const events = [
    event('1', t, 'Tasks/x.md', 'status', 'todo', 'doing'),
    event('2', t, 'Archive/x.md', 'path', 'Tasks/x.md', 'Archive/x.md'),
  ]
  expect(historyTimeline([parseHistoryFile(jsonl(...events))]).map(e => e.id)).toEqual(['2', '1'])
  const groups = grouped(events)
  expect([...groups.keys()]).toEqual(['Archive/x.md'])
  expect(historyTouchDay(groups.get('Archive/x.md')!)).toBe('2026-10-14')
})

test('grouping: equal-time moves follow their chain (x to y before y to a)', () => {
  const t = T('2026-10-14')
  const events = [
    event('1', T('2026-10-10'), 'Tasks/x.md', 'status', 'todo', 'doing'),
    event('2', t, 'Tasks/y.md', 'path', 'Tasks/x.md', 'Tasks/y.md'),
    event('3', t, 'Tasks/a.md', 'path', 'Tasks/y.md', 'Tasks/a.md'),
  ]
  expect(historyTimeline([parseHistoryFile(jsonl(...events))]).map(e => e.id)).toEqual(['1', '3', '2']) // by path: a before y
  const groups = grouped(events)
  expect([...groups.keys()]).toEqual(['Tasks/a.md'])
  expect(keysOf(groups.get('Tasks/a.md')?.events)).toEqual(['status', 'path', 'path'])
})

test('grouping: moves that form a cycle keep the timeline\'s order and do not hang', () => {
  const t = T('2026-10-14')
  const groups = grouped([
    event('1', t, 'Tasks/b.md', 'path', 'Tasks/a.md', 'Tasks/b.md'),
    event('2', t, 'Tasks/a.md', 'path', 'Tasks/b.md', 'Tasks/a.md'),
  ])
  // by path the timeline is 2 then 1; 2 finds nothing at b, 1 then carries it from a to b
  expect([...groups.keys()]).toEqual(['Tasks/b.md'])
  expect(groups.get('Tasks/b.md')?.events.map(e => e.id)).toEqual(['2', '1'])
})

test('grouping: the secrets folder is left out, a move into or out of it too', () => {
  const groups = grouped([
    event('1', T('2026-10-01'), 'Secrets/s.md', 'status', 'todo', 'doing'),
    event('2', T('2026-10-02'), 'Secrets/deep/s.md', 'stage', null, 'x'),
    event('3', T('2026-10-03'), 'Tasks/a.md', 'status', 'todo', 'doing'),
    event('4', T('2026-10-04'), 'Secrets/a.md', 'path', 'Tasks/a.md', 'Secrets/a.md'), // into the folder
    event('5', T('2026-10-05'), 'Tasks/z.md', 'status', 'todo', 'doing'),
  ])
  expect([...groups.keys()]).toEqual(['Tasks/z.md'])
  expect(grouped([event('1', T('2026-10-01'), 'Secretsz/s.md', 'status', 'todo', 'doing')]).has('Secretsz/s.md')).toBe(true)
})

test('grouping: a move out of the secrets folder shows nothing of its past, and drops the group the destination had', () => {
  const groups = grouped([
    event('1', T('2026-10-01'), 'Tasks/b.md', 'status', 'todo', 'doing'),
    event('2', T('2026-10-02'), 'Tasks/b.md', 'path', 'Tasks/b.md', null),
    event('3', T('2026-10-03'), 'Tasks/b.md', 'path', 'Secrets/b.md', 'Tasks/b.md'), // out of the folder
  ])
  expect(groups.has('Tasks/b.md')).toBe(false)
  const later = grouped([
    event('1', T('2026-10-03'), 'Tasks/b.md', 'path', 'Secrets/b.md', 'Tasks/b.md'),
    event('2', T('2026-10-04'), 'Tasks/b.md', 'stage', null, 'x'),
  ]).get('Tasks/b.md')
  expect(later?.events.map(e => e.id)).toEqual(['2'])
})

test('grouping: an empty secrets folder hides nothing', () => {
  const events = [event('1', T('2026-10-01'), 'Secrets/s.md', 'status', 'todo', 'doing')]
  expect(grouped(events, '').has('Secrets/s.md')).toBe(true)
  expect(grouped(events, 'Private').has('Secrets/s.md')).toBe(true)
})

test('grouping: the secrets folder itself is a secrets path', () => {
  expect(grouped([event('1', T('2026-10-01'), 'Secrets', 'status', 'todo', 'doing')]).size).toBe(0)
})

// One task path recorded in two Unicode forms (NFC by a write, NFD by a reconcile of a file name a
// drive or an OS decomposed) is ONE task: the events are merged when they are read.
const NFC_PATH = 'Tasks/\u00e9.md'
const NFD_PATH = 'Tasks/e\u0301.md'

test('grouping: one task path in two Unicode forms is one group, whatever the order of the events', () => {
  const groups = grouped([
    event('1', T('2026-10-10'), NFC_PATH, 'status', 'todo', 'doing'),
    event('2', T('2026-10-12'), NFD_PATH, 'stage', null, 'implementing'),
    event('3', T('2026-10-14'), NFC_PATH, '~checkboxes', '0/1', '1/1'),
  ])
  expect([...groups.keys()]).toEqual([NFC_PATH])
  expect(keysOf(groups.get(NFC_PATH)?.events)).toEqual(['status', 'stage', '~checkboxes'])
  expect(historyTouchDay(groups.get(NFC_PATH)!)).toBe('2026-10-14')
})

test('reading: path, old and new of an event are NFC; a move between two forms is a move, not a new path', () => {
  const [moved, listed] = parseHistoryFile(
    jsonl(
      event('1', T('2026-10-10'), NFD_PATH, 'path', 'Tasks/a.md', NFD_PATH),
      event('2', T('2026-10-11'), NFD_PATH, 'branch', ['e\u0301', 'x'], 'e\u0301'),
    ),
  )
  expect([moved!.path, moved!.new]).toEqual([NFC_PATH, NFC_PATH])
  expect([listed!.path, listed!.old, listed!.new]).toEqual([NFC_PATH, ['\u00e9', 'x'], '\u00e9'])
  const groups = grouped([
    event('0', T('2026-10-09'), 'Tasks/a.md', 'status', 'todo', 'doing'),
    event('1', T('2026-10-10'), NFD_PATH, 'path', 'Tasks/a.md', NFD_PATH),
  ])
  expect([...groups.keys()]).toEqual([NFC_PATH])
  expect(groups.get(NFC_PATH)?.deleted).toBe(false)
})

test('grouping: a secrets folder written in another Unicode form still hides its tasks', () => {
  const folder = 'S\u00e9crets'
  expect(grouped([event('1', T('2026-10-01'), 'Se\u0301crets/s.md', 'status', 'todo', 'doing')], folder).size).toBe(0)
})

// ── reading a note ───────────────────────────────────────────────────────

test('parseNote reads the fields, one pair of quotes off (not the status), and empty markers as nothing', () => {
  const parsed = parseNote(
    note('status: DOING\nstage: verified\npriority: 3\nstart: "2026-10-12"\nbranch: ~\nmr: []', '- [x] a'),
  )
  expect(parsed).toMatchObject({
    status: 'doing',
    stage: 'verified',
    priority: 3,
    start: '2026-10-12',
    hasBranch: false,
    hasMr: false,
  })
})

test('parseNote reads a block list as present, an empty one as absent', () => {
  const parsed = parseNote(note('status: doing\nbranch:\n  - feat/x\nmr:\n', ''))
  expect(parsed.hasBranch).toBe(true)
  expect(parsed.hasMr).toBe(false)
})

test('parseNote reads a start that is not a day as no start', () => {
  expect(parseNote(note('status: doing\nstart: 2026-02-30', '')).start).toBeNull()
  expect(parseNote(note('status: doing\nstart: soon', '')).start).toBeNull()
  expect(parseNote(note('status: doing\nstart: 2026-10-12', '')).start).toBe('2026-10-12')
})

test('parseNote gives no priority for a value that is not a number', () => {
  expect(parseNote(note('status: doing\npriority: high', '')).priority).toBeNull()
  expect(parseNote(note('status: doing', '')).priority).toBeNull()
})

// ── the last step, the age and the flags ─────────────────────────────────

const parsed = (frontmatter: string, body = ''): ReturnType<typeof parseNote> => parseNote(note(frontmatter, body))

test('the last step is the newer of the last Log line and start; the file time only when there is neither', () => {
  const mtimeMs = Date.parse('2026-10-01T10:00:00Z')
  expect(lastTouch(parsed('status: doing\nstart: 2026-10-12', '## Log\n- 2026-10-14 — x'), mtimeMs)).toEqual({
    day: '2026-10-14',
    source: 'log',
  })
  expect(lastTouch(parsed('status: doing\nstart: 2026-10-14', '## Log\n- 2026-10-12 — x'), mtimeMs)).toEqual({
    day: '2026-10-14',
    source: 'start',
  })
  expect(lastTouch(parsed('status: doing\nstart: 2026-10-12'), mtimeMs)).toEqual({ day: '2026-10-12', source: 'start' })
  expect(lastTouch(parsed('status: doing'), mtimeMs)).toEqual({ day: '2026-10-01', source: 'edited' })
  expect(lastTouch(parsed('status: doing'), 0)).toBeNull()
})

test('a file time newer than the Log does not reset the clock', () => {
  const fresh = Date.parse('2026-10-15T09:00:00Z')
  expect(lastTouch(parsed('status: doing', '## Log\n- 2026-10-10 — x'), fresh)).toEqual({ day: '2026-10-10', source: 'log' })
})

const taskOf = (frontmatter: string, body = '', mtimeMs = 0, stalledDays = 2): BandTask => {
  const result = parsed(frontmatter, body)
  return bandTask('ABC-9 — t', result.status as 'doing' | 'review', result, mtimeMs, TODAY, stalledDays)
}

test('stalled is the age of the last step against stalledDays, the boundary included', () => {
  const log = (day: string) => `## Log\n- ${day} — x`
  const doing = 'status: doing\nstage: implementing\nbranch: b'
  expect(taskOf(doing, log('2026-10-14')).flags).toEqual([])
  expect(taskOf(doing, log('2026-10-13')).flags).toEqual(['stalled'])
  expect(taskOf(doing, log('2026-10-13'), 0, 3).flags).toEqual([])
  expect(taskOf(doing, log('2026-10-12'), 0, 3).flags).toEqual(['stalled'])
})

test('a step dated in the future is not stalled and shows its date', () => {
  const task = taskOf('status: doing\nstage: implementing\nbranch: b', '## Log\n- 2026-10-20 — x')
  expect(task.ageDays).toBe(-5)
  expect(task.flags).toEqual([])
  expect(ageText(task)).toBe('10-20')
})

test('a doing task with no step at all claims nothing', () => {
  const task = taskOf('status: doing\nstage: implementing\nbranch: b')
  expect(task.ageDays).toBeNull()
  expect(task.flags).toEqual([])
  expect(ageText(task)).toBe('')
})

test('a review task is never stalled: it waits for the person', () => {
  const task = taskOf('status: review\nmr: !1', '## Log\n- 2026-09-01 — x')
  expect(task.flags).toEqual([])
  expect(ageText(task)).toBe('44d ago')
})

test('a doing task flags a missing stage and a missing branch; a review task a missing MR', () => {
  expect(taskFlags(parsed('status: doing'), 'doing', 0, 2)).toEqual(['no stage', 'no branch'])
  expect(taskFlags(parsed('status: doing\nstage: ""\nbranch: x'), 'doing', 0, 2)).toEqual(['no stage'])
  expect(taskFlags(parsed('status: doing\nstage: verified\nbranch: x'), 'doing', 0, 2)).toEqual([])
  expect(taskFlags(parsed('status: review'), 'review', 0, 2)).toEqual(['no MR'])
  expect(taskFlags(parsed('status: review\nmr: https://x/1'), 'review', 0, 2)).toEqual([])
  // a review task needs no branch and no stage; a doing task needs no MR
  expect(taskFlags(parsed('status: review\nmr: 7'), 'review', 0, 2)).toEqual([])
  expect(taskFlags(parsed('status: doing\nstage: verified\nbranch: x'), 'doing', 0, 2)).not.toContain('no MR')
})

test('stalledDays is a whole number of at least 1, else two', () => {
  expect(resolveStalledDays(5)).toBe(5)
  expect(resolveStalledDays(1)).toBe(1)
  for (const bad of [0, -1, 1.5, '3', null, undefined, Number.NaN]) expect(resolveStalledDays(bad)).toBe(2)
})

test('the stage step and dots: the stage name is folded, an unknown one counts as the first step, none as none', () => {
  const stage = (text: string) => taskOf(`status: doing\nstage: ${text}\nbranch: b`)
  expect(stageStep(stage('Agent review'))).toBe(2)
  expect(stageStep(stage('agent_review'))).toBe(2)
  expect(stageStep(stage('implementing'))).toBe(1)
  expect(stageStep(stage('verified'))).toBe(3)
  expect(stageStep(stage('something old'))).toBe(1)
  expect(stageStep(taskOf('status: doing'))).toBe(0)
  expect(stageStep(taskOf('status: review'))).toBe(4)
  expect(stageDots(stage('verified'))).toBe('●●●○')
  expect(stageDots(taskOf('status: doing'))).toBe('○○○○')
})

test('a doing task with the stage `review` (or any text that is no agent stage) shows as implementing, as the app does', () => {
  for (const text of ['review', 'Review', 'done', 'something old', '"todo"']) {
    const task = taskOf(`status: doing\nstage: ${text}\nbranch: b`)
    expect(stageName(task)).toBe('implementing')
    expect(stageStep(task)).toBe(1)
    expect(stageDots(task)).toBe('●○○○')
    expect(task.flags).not.toContain('no stage')
  }
  // a review TASK is at its fourth step whatever its stage says
  expect(stageStep(taskOf('status: review\nstage: implementing\nmr: 7'))).toBe(4)
})

test('flag text is the first flag and how many more', () => {
  expect(flagText(taskOf('status: doing', '## Log\n- 2026-10-01 — x'))).toBe('stalled +2')
  expect(flagText(taskOf('status: doing\nstage: verified', '## Log\n- 2026-10-14 — x'))).toBe('no branch')
  expect(flagText(taskOf('status: doing\nstage: verified\nbranch: b'))).toBe('')
})

test('the row says everything as a sentence', () => {
  const task = taskOf(
    'status: doing\npriority: 1\nbranch: b',
    '- [x] a\n- [~] b\n- [ ] c\n## Log\n- 2026-10-10 — x',
  )
  expect(rowAlt({ ...task, id: 'ABC-77 — band labels' })).toBe(
    'ABC-77 band labels, priority 1, no stage, criteria 1/3 (1 waived), last step 5d ago, flags: stalled, no stage',
  )
})

// ── the terminal row ─────────────────────────────────────────────────────

const tasksOf = (): BandTask[] => [
  taskOf('status: doing\nstage: agent-review\npriority: 2\nbranch: b', '- [x] a\n- [ ] b\n## Log\n- 2026-10-14 — x'),
  taskOf('status: review\npriority: 1', ''),
  taskOf('status: doing\npriority: 3', '- [x] a\n- [~] b\n- [ ] c\n## Log\n- 2026-10-10 — x'),
].map((task, index) => ({ ...task, id: ['ABC-1 — alpha task', 'ABC-2/T3 — beta task', 'ABC-4 — delta task'][index]! }))

test('the bar shows the criteria only and puts a tick at each box boundary', () => {
  const task = { ...tasksOf()[0]!, done: 1, waived: 0, total: 3 }
  const runs = barRuns(task, 60)
  const bar = runs.map(run => run.text).join('')
  expect(bar).toHaveLength(60)
  expect(bar).not.toContain('[')
  expect(bar.slice(0, 20)).toBe('█'.repeat(20))
  expect(bar[20]).toBe('│')
  expect(bar[40]).toBe('│')
  expect(runs.filter(run => run.kind === 'tick-empty')).toHaveLength(2)
})

test('a note without boxes has an empty bar and a dash for a count', () => {
  const task = tasksOf()[1]!
  expect(barRuns(task, 20).map(run => run.text).join('')).toBe('░'.repeat(20))
  expect(rowCells(task, rowLayout([task], 100)).count.trim()).toBe('—')
})

test('a wide band shows every piece and the row fills the width', () => {
  const tasks = tasksOf()
  const layout = rowLayout(tasks, 120)
  expect(layout.stageWidth).toBe('agent-review'.length)
  expect(layout.ageWidth).toBe('5d ago'.length)
  expect(layout.flagMark).toBe(false)
  expect(rowWidth(layout)).toBe(120)
  const cells = rowCells(tasks[2]!, layout)
  expect(cells.flag.trim()).toBe('stalled +2')
  expect(cells.priority).toBe('P3 ')
})

test('on a narrower band the flag text goes first, then the stage name, then the age, then the title shrinks', () => {
  const tasks = tasksOf()
  const seen: string[] = []
  let previous = ''
  for (let columns = 130; columns >= 36; columns--) {
    const layout = rowLayout(tasks, columns)
    const state = `${layout.flagMark ? 'mark' : 'text'}/${layout.stageWidth > 0 ? 'name' : 'dots'}/${layout.ageWidth > 0 ? 'age' : 'noage'}`
    if (state !== previous) seen.push(state)
    previous = state
    // the row is never wider than the band, down to the width where only the title can still give
    if (columns >= 44) expect(rowWidth(layout)).toBeLessThanOrEqual(columns)
    expect(layout.barWidth).toBeGreaterThanOrEqual(8)
  }
  expect(seen).toEqual(['text/name/age', 'mark/name/age', 'mark/dots/age', 'mark/dots/noage'])
})

test('a task with no flag leaves no flag column', () => {
  const task = tasksOf()[0]!
  const layout = rowLayout([task], 100)
  expect(layout.flagWidth).toBe(0)
  expect(rowCells(task, layout).flag).toBe('')
})

// ── the desktop row ──────────────────────────────────────────────────────

test('the desktop row: filled dots for the step, a fill and a tick for each box, the labels as text', () => {
  const task: BandTask = {
    ...taskOf('status: doing\nstage: agent-review\npriority: 3\nbranch: b', '## Log\n- 2026-10-14 — x'),
    id: 'ABC-7 — a <b> & "c"',
    done: 2,
    waived: 0,
    total: 5,
  }
  const source = rowSvg(task, 900)
  const number = (pattern: RegExp) => Number(pattern.exec(source)?.[1])

  const trackWidth = number(/<rect class="track" x="\d+" y="\d+" width="(\d+)"/)
  const fillWidth = number(/<rect x="\d+" y="\d+" width="(\d+)" height="\d+" fill="#8B87F5" fill-opacity="\.14"/)

  expect(fillWidth).toBe(Math.round(trackWidth * 0.4))
  expect((source.match(/<line /g) ?? []).length).toBe(4)
  expect((source.match(/<circle cx="\d+" cy="14" r="3\.5"/g) ?? []).length).toBe(2)
  expect((source.match(/class="dot-empty"/g) ?? []).length).toBe(2)
  expect(source).toContain('>2/5<')
  expect(source).toContain('>1d ago<')
  expect(source).toContain('>agent-review<')
  expect(source).toContain('a &#60;b&#62; &#38; &#34;c&#34;')
  expect(source).not.toContain('<b>')
})

test('on a narrow desktop band the flag becomes a mark, then the stage name goes, then the age', () => {
  const tasks = tasksOf()
  const seen: string[] = []
  let previous = ''
  for (let width = 1000; width >= 320; width -= 4) {
    const layout = desktopLayout(tasks, width)
    const state = `${layout.flagMark ? 'mark' : 'text'}/${layout.nameWidth > 0 ? 'name' : 'dots'}/${layout.ageEnd === null ? 'noage' : 'age'}`
    if (state !== previous) seen.push(state)
    previous = state
    // the band is never narrower than 320: the track keeps 80 there
    expect(layout.trackWidth).toBeGreaterThanOrEqual(80)
  }
  expect(seen).toEqual(['text/name/age', 'mark/name/age', 'mark/dots/age', 'mark/dots/noage'])

  // the stage dots, the track with its count and the flag mark stay on the narrowest band
  const narrow = desktopLayout(tasks, 320)
  const source = rowSvg(tasks[2]!, 320, narrow)
  expect((source.match(/<circle /g) ?? []).length).toBe(4)
  expect(source).toContain('>1/3<')
  expect(source).toContain('>!<')
  expect(source).not.toContain('>no stage<')
  expect(source).not.toContain('>5d ago<')
})

// ── display width: columns, not UTF-16 units; cuts only between graphemes ──

// A surrogate that has no partner: what a cut through the middle of a pair leaves.
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/

const WIDTHS: [string, number][] = [
  ['', 0],
  ['abc', 3],
  ['日本語', 6],
  ['한글', 4],
  ['Ａ', 2], // fullwidth
  ['🚀', 2],
  ['❤️', 2], // text heart + emoji variation selector
  ['🇹🇷', 2], // a flag is two regional indicators
  ['👩‍💻', 2], // a ZWJ sequence is one emoji
  ['é', 1], // a combining mark takes no column
  ['‍', 0],
]

test('display width: wide and emoji clusters take two columns, combining parts none', () => {
  for (const [text, columns] of WIDTHS) expect(`${text} ${displayWidth(text)}`).toBe(`${text} ${columns}`)
})

test('display width and grapheme splitting do not need Intl.Segmenter', () => {
  for (const [text, columns] of WIDTHS) expect(`${text} ${displayWidth(text, null)}`).toBe(`${text} ${columns}`)
  expect(splitGraphemes('a👩‍💻b🇹🇷é🚀', null)).toEqual(['a', '👩‍💻', 'b', '🇹🇷', 'é', '🚀'])
  expect(truncate('日本語日本語', 7, null)).toBe('日本語…')
})

test('truncate cuts on a grapheme boundary and fits the width', () => {
  expect(truncate('日本語日本語', 7)).toBe('日本語…')
  expect(truncate('日本語日本語', 12)).toBe('日本語日本語')
  expect(truncate('🚀🚀🚀', 4)).toBe('🚀…')
  expect(truncate('👩‍💻👩‍💻', 3)).toBe('👩‍💻…')
  expect(truncate('🚀🚀', 1)).toBe('…')
  expect(truncate('abc', 0)).toBe('')
  for (const [text] of WIDTHS) {
    for (let width = 0; width < 8; width++) {
      const cut = truncate(text.repeat(5), width)
      expect(LONE_SURROGATE.test(cut)).toBe(false)
      expect(displayWidth(cut)).toBeLessThanOrEqual(width)
    }
  }
})

const titled = (title: string): BandTask[] => [
  { ...taskOf('status: doing\nstage: verified\npriority: 2\nbranch: b', '- [x] a\n- [ ] b\n## Log\n- 2026-10-14 — x'), id: `ABC-1 — ${title}` },
  { ...taskOf('status: review\nmr: 3', ''), id: 'ABC-2 — plain' },
]

test('a CJK title fits the band at 80 and 120 columns, row for row', () => {
  for (const columns of [80, 120]) {
    const tasks = titled('日本語のとても長いタイトルがここにあります'.repeat(2))
    const layout = rowLayout(tasks, columns)
    expect(rowWidth(layout)).toBeLessThanOrEqual(columns)
    for (const task of tasks) {
      expect(displayWidth(rowLine(task, layout))).toBe(rowWidth(layout))
      expect(LONE_SURROGATE.test(rowLine(task, layout))).toBe(false)
    }
  }
})

test('a ZWJ-emoji title leaves no lone surrogate on the terminal or in the SVG', () => {
  const tasks = titled('👩‍💻 dev '.repeat(12))
  for (const columns of [44, 60, 80, 120]) {
    const layout = rowLayout(tasks, columns)
    for (const task of tasks) {
      const cells = rowCells(task, layout)
      for (const cell of Object.values(cells)) expect(LONE_SURROGATE.test(cell)).toBe(false)
      expect(displayWidth(rowLine(task, layout))).toBe(rowWidth(layout))
    }
  }
  for (let width = 320; width < 1200; width += 23) {
    for (const task of tasks) {
      expect(LONE_SURROGATE.test(rowSvg(task, width, desktopLayout(tasks, width)))).toBe(false)
      expect(LONE_SURROGATE.test(rowAlt(task))).toBe(false)
    }
  }
})

test('an emoji title never produces a lone surrogate in the SVG at any width from 320 to 1199', () => {
  const tasks = titled('🚀'.repeat(80))
  let bad = 0
  for (let width = 320; width < 1200; width++) {
    const layout = desktopLayout(tasks, width)
    for (const task of tasks) if (LONE_SURROGATE.test(rowSvg(task, width, layout))) bad++
  }
  expect(bad).toBe(0)
})

test('a wide title is cut before the stage dots on the desktop', () => {
  for (const width of [320, 600, 1000]) {
    const tasks = titled('日本語のとても長いタイトルがここにあります'.repeat(2))
    const layout = desktopLayout(tasks, width)
    const label = layout.labelEnd - layout.priorityWidth
    const title = fitTitle('日本語のとても長いタイトルがここにあります'.repeat(2), label, 13)
    expect(textWidth(title, 13)).toBeLessThanOrEqual(label)
    expect(title.endsWith('…')).toBe(true)
    // a CJK character is about one em (13px) wide: no more of them than fit in the label
    expect(splitGraphemes(title).length - 1).toBeLessThanOrEqual(Math.floor(label / 13))
  }
})

// ── the priority column is as wide as the widest priority in the set ──

const withPriorities = (...priorities: (number | null)[]): BandTask[] =>
  priorities.map((priority, index) => ({
    ...taskOf('status: doing\nstage: verified\nbranch: b', '- [x] a'),
    id: `ABC-${index + 1} — task ${index + 1}`,
    priority,
  }))

test('the priority column fits the widest priority: P12, P1 beside P10, 1.5, -1, none at all', () => {
  const sets: [string, BandTask[], string][] = [
    ['P12', withPriorities(12), 'P12 ABC-1'],
    ['P1 and P10', withPriorities(1, 10), 'P1  ABC-1'],
    ['1.5', withPriorities(1.5, 2), 'P1.5 ABC-1'],
    ['-1', withPriorities(-1), 'P-1 ABC-1'],
    ['none', withPriorities(null, null), 'ABC-1'],
    ['one without, one with', withPriorities(null, 3), '   ABC-1'],
  ]
  for (const [name, tasks, start] of sets) {
    for (const columns of [60, 80, 120]) {
      const layout = rowLayout(tasks, columns)
      expect(`${name} ${rowWidth(layout)}`).toBe(`${name} ${Math.min(rowWidth(layout), columns)}`)
      for (const task of tasks) expect(`${name} ${displayWidth(rowLine(task, layout))}`).toBe(`${name} ${rowWidth(layout)}`)
      expect(`${name} ${rowLine(tasks[0]!, layout).startsWith(start)}`).toBe(`${name} true`)
    }
  }
  expect(rowLayout(withPriorities(null), 80).priorityWidth).toBe(0)
  expect(rowLayout(withPriorities(12), 80).priorityWidth).toBe(4)
})

test('on the desktop the priority tag never reaches the label', () => {
  for (const priority of [1, 12, 100, 1.5, -1]) {
    const tasks = withPriorities(priority, 2)
    for (const width of [320, 700, 1100]) {
      const layout = desktopLayout(tasks, width)
      expect(textWidth(priorityText(tasks[0]!), 12) + 6).toBeLessThan(layout.priorityWidth)
      expect(layout.labelEnd).toBeGreaterThan(layout.priorityWidth)
    }
  }
  expect(desktopLayout(withPriorities(null), 700).priorityWidth).toBeLessThan(26)
})
