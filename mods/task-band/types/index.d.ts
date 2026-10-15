/** What a task's record says is wrong with it. */
export type BandFlag = 'stalled' | 'no stage' | 'no branch' | 'no MR'

export type BandTask = {
  /** Path under the tasks folder, without `.md`; also the hide key. */
  id: string
  status: 'doing' | 'review'
  /** The stage, lower-case with `-` for blanks; null when the note has none. */
  stage: string | null
  priority: number | null
  /** Ticked boxes (`[x]`). */
  done: number
  /** Waived boxes (`[~]`): in `total`, neither done nor open. */
  waived: number
  /** Every box: `[ ]`, `[x]` and `[~]` — the app's `n/m`. */
  total: number
  /** `YYYY-MM-DD` of the last step: the newer of the last Log line and `start`, else the note's file time. */
  lastDay: string | null
  lastSource: 'log' | 'start' | 'edited' | null
  /** Whole days from `lastDay` to today (UTC); negative for a step dated in the future. */
  ageDays: number | null
  flags: BandFlag[]
}

/** What the last refresh found: tasks, or why there are none to show. */
export type BandSnapshot =
  | { kind: 'none' }
  | { kind: 'missing'; path: string }
  | { kind: 'unresolved'; vault: string }
  | { kind: 'error'; message: string }
  | { kind: 'tasks'; tasks: BandTask[] }

declare module 'claude-code' {
  interface PluginState {
    'memoz-task-band': { snapshot: BandSnapshot; hidden: string[] }
  }
}
