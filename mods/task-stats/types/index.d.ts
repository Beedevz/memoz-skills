export type StatusCounts = Record<string, number>

export type ActiveTask = { name: string; status: string; parent?: string }

export type TaskStats = {
  prefix: string
  vaultPath: string
  main: { total: number; byStatus: StatusCounts }
  sub: { total: number; byStatus: StatusCounts }
  /** Notes with a `status` that are not tasks: neither named after a task id nor inside a task's folder. */
  unprefixed: number
  /** Open (todo) tasks, main and sub, by priority; "none" when the note has none. */
  todoByPriority: StatusCounts
  /** doing and review tasks, main and sub. */
  active: ActiveTask[]
  doneLast7: number
  doneLast30: number
  /** Tasks closed per 7-day window, oldest first; the last entry is the 7 days ending today. */
  weeklyDone: number[]
  computedAt: number
  /** The local day the counts were taken on, `YYYY-MM-DD`; `done:` dates are compared with it. */
  today: string
}

/** Why there is nothing to count; never shown as zero tasks. */
export type StatsProblem = { problem: string }

/** A declaration that is valid but tracks tasks elsewhere: nothing to count, nothing to report. */
export type StatsIdle = { idle: string }

/** `null`: no `.memoz/tasks.json` at or above the session's directory (state holds JSON, never undefined). */
export type StatsResult = TaskStats | StatsProblem | StatsIdle | null

declare module 'claude-code' {
  interface PluginState {
    'memoz-task-stats': { stats: StatsResult }
  }
}
