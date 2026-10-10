export type BandTask = {
  /** Path under the tasks folder, without `.md`; also the hide key. */
  id: string
  status: 'doing' | 'review'
  stage: string | null
  priority: number | null
  /** Ticked boxes (`- [x]`). */
  done: number
  /** All boxes: `- [ ]`, `- [x]` and `- [~]`. */
  total: number
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
