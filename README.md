# memoz-skills

Agent skills for [Memoz](https://memoz.md) — project management and engineering discipline,
backed by your own Memoz vault.

These skills teach an AI coding agent **how to work**, not **where your files are**. Where your
work lives is something your project *declares*; the skills read that declaration.

## Install

**Antigravity CLI** (`agy`)

```bash
agy plugin install https://github.com/Beedevz/memoz-skills.git
```

Installs the whole repository as a plugin; the skills are picked up automatically.

Data access is a second, one-line step — the plugin format does not carry an MCP server on this
build:

```bash
agy mcp add memoz memoz --vault /path/to/your/vault mcp
```

Requires the `memoz` CLI on your `PATH`.

**Name the vault explicitly.** Without `--vault` the CLI falls back to `defaultVault` in
`~/.memoz/config.json`, which is often a *different* vault from the one your project is about —
and nothing warns you. The skills then look for tasks in a vault that has none, and report that
there is no work to do.

⚠️ The `vault` field in `.memoz/tasks.json` and the vault your MCP server points at are **two
separate settings**. They can disagree silently. If a skill says there are no tasks while you can
see them in the app, check that they agree first.

**Gemini CLI**

```bash
gemini skills install https://github.com/Beedevz/memoz-skills.git --path skills/memoz-task-flow
```

> The install itself works, but Gemini CLI now refuses to sign in on individual Gemini Code
> Assist accounts and points users to the Antigravity suite. If that applies to you, use the
> Antigravity command above instead.

**Claude Code**

```bash
claude plugin marketplace add Beedevz/memoz-skills
claude plugin install memoz@memoz-skills
```

Data access is again a separate step, and again name the vault explicitly:

```bash
claude mcp add memoz -- memoz --vault /path/to/your/vault mcp
```

> The plugin deliberately does **not** ship an MCP server entry. It could, but only by hardcoding
> a command with no vault — which falls back to whichever vault is configured as the default, and
> that is exactly the silent mismatch warned about above. A one-line step you can see beats a
> configuration that quietly points somewhere else.

**Codex CLI** — copy the rendered prompt into `~/.codex/prompts/`. See `hosts/codex/`.

> Data access is separate from the skills. Memoz ships an MCP server; the Memoz app generates
> the right configuration per host (Settings → MCP) for Claude Desktop/Code, Codex, Gemini,
> Cursor and VS Code.

## Declare where your work lives

Every project that uses these skills carries one small file:

```jsonc
// <your-project>/.memoz/tasks.json
{
  "prefix": "ABC",              // task ids become ABC-1, ABC-2, ...
  "backend": "vault",           // "vault" | "repo"
  "vault": "My Notes",          // which Memoz vault
  "folder": "Projects/ABC"      // scope inside the vault
}
```

| field | meaning | if missing |
|---|---|---|
| `prefix` | task-id prefix | **ask** |
| `backend` | `vault` or `repo` | **ask** |
| `vault` | which vault (`backend: vault`) | **ask** |
| `folder` | scope inside the vault | vault root |
| `taskDir` | task directory (`backend: repo`) | `docs/tasks` |
| `hotFiles` | files parallel work tends to share, and how a collision resolves (`regenerate` + `command`, or `serialize`) | nothing treated as shared |

**If the file is missing, the skills stop and ask.** They never guess.

The reason is not politeness. An MCP server is reachable from every directory, so detecting the
backend from what is reachable would, in an unrelated project, silently adopt **another
project's** tasks. Reachability is a *capability*; ownership is a *declaration*, and only the
project can make it.

## Skills

| skill | what it enforces |
|---|---|
| `memoz-task-flow` | The entry point: find the active task from the declaration, checkpoint its record after every step, close it; several pieces at once go to parallel work. Never invent task files |
| `memoz-closure` | Record what was learned before the context is gone — including what was **falsified** |
| `memoz-pattern-log` | Count the mistakes that repeat — one place, one count, recognisable early |
| `memoz-mutation` | Prove a test locks something: break it on purpose. *Not applied* is not a pass |
| `memoz-decision` | The decision **and the options rejected**, with the ground for each |
| `memoz-measurement` | A number with its conditions — and what it does not show |
| `memoz-friction` | What got in the way, recorded at the moment it happened |
| `memoz-brainstorming` | Ask the knowledge layer **first** — a settled question stays settled |
| `memoz-debugging` | Eliminate, don't guess — and keep the hypotheses that were **falsified** |
| `memoz-verification` | Evidence before the claim — and the claim and the check must match |
| `memoz-planning` | Pieces you can finish, criteria you can **run**, and a stated boundary |
| `memoz-parallel-work` | One worktree per piece; **ask before overlapping work runs in parallel**; re-verify every agent's claim |

Each one ends by writing into your knowledge layer: a process that leaves no trace is a
conversation, not a record.

### Agents (Claude Code)

`memoz-parallel-work` hands pieces to two roles, shipped as plugin agents:

| agent | does | never does |
|---|---|---|
| `memoz-implementer` | one piece, in its own worktree; report into the task note | push · merge · change task status · write checkpoints |
| `memoz-reviewer` | an independent, adversarial read of the diff — contracts the compiler cannot see; returns its report as its last message | change code · open the task note |

Hosts without sub-agents get the same role text as flat prompts under `hosts/codex/`.

The reviewer has **no knowledge-layer tools**. An agent's tool list names an MCP server by its
registered name, and with several Memoz vaults connected — each served under its own name — a
fixed name points at one vault only, possibly not this project's — and then the report can be lost
to a failed write, or can land in the wrong vault. So the reviewer hands its report back, and the
orchestrator records it through the server it settled on for the project's declared vault. The
implementer is given that server by name, and stops rather than write into a different vault.

### Task band (Claude Code mod)

An optional second plugin, `memoz-task-band`, draws a band above the Claude Code prompt with the
project's tasks that are `doing` or in `review`: one row per task, its stage as a pill
(`implementing 1/4` → `agent-review 2/4` → `verified 3/4` → `review 4/4`), and a progress bar
over its completion criteria (`- [x]` of all `- [ ]`/`- [x]`/`- [~]` boxes; the stage when the
note has none). The desktop app draws the bar as a graphic, the terminal as text. ✕ hides a row
for the session; `n hidden · show` brings them back. It reads the same `.memoz/tasks.json`
declaration as the skills and never writes to the vault.

```bash
claude plugin install memoz-task-band@memoz-skills
```

A vault the declaration names without a path (`"vault": "My Notes"`) is looked up under
`vaultsDir`, the folder that holds your vaults. Set it once, in `/config` or with:

```bash
echo '{"vaultsDir":"~/path/to/vaults"}' | claude plugin configure memoz-task-band@memoz-skills --values-stdin
```

Until it is set the band says so instead of guessing a location. A declaration that names the
vault by absolute path needs no setting.

### Task stats (Claude Code mod)

A third plugin, `memoz-task-stats`, counts the project's tasks under the declared `prefix`. A
status line shows the totals, for example
`ABC 230+82 tasks · doing 4 · review 1 · todo 49 · 83% done · 7d +17`: main tasks + sub-tasks,
the done share of the tasks not dropped, and tasks closed in the last 7 days. A main task is a
note named after a task id (`ABC-12 …`) anywhere under the declared folder; a sub-task is a note
inside a task's folder (`ABC-12/T3 …`). Other notes with a `status` (decisions such as
`ABC-D1`, plans) are not counted as tasks; the pane shows how many there are.
`/task-stats` opens a pane with the status breakdown, tasks closed per week over the last 12
weeks (from each note's `done:` date), open tasks by priority, and what is in `doing` or
`review`. The desktop app draws the pane as a chart, the terminal as a table. It re-reads the
vault every minute and after each turn, rereading only the notes whose files changed, and never
writes to it.

```bash
claude plugin install memoz-task-stats@memoz-skills
```

It finds the vault the same way as the band, through its own `vaultsDir`:

```bash
echo '{"vaultsDir":"~/path/to/vaults"}' | claude plugin configure memoz-task-stats@memoz-skills --values-stdin
```

> Mods use Claude Code's function-hooks API, which is **early access** and may change between
> releases. These are tested on Claude Code 2.1.295; if a later release breaks one, the
> transcript names the plugin and the reason, and the rest of Claude Code is unaffected.

## Layout

```
core/            host-agnostic discipline text — the single source
plugin.json      plugin identity — the single source for every manifest
skills/          SKILL.md form (Claude Code + Gemini CLI + Antigravity share this shape)
hosts/           per-host renders that are not SKILL.md (e.g. Codex prompts)
agents/          Claude Code agent roles, rendered from core/agents/
.claude-plugin/  Claude Code plugin + marketplace manifests
mods/            Claude Code mods (hooks modules), one plugin per folder — hand-written code
```

`skills/`, `hosts/`, `agents/` and `.claude-plugin/` are **generated** — do not hand-edit them. Agent instructions
maintained separately per host drift apart quickly, and the drift is silent: the same command
behaves differently depending on which tool you happen to be using. One source, rendered per host.

```bash
node scripts/render.mjs   # regenerate
node scripts/check.mjs    # fail if the generated files drift from core/
```

`check.mjs` runs in CI, so a hand-edit cannot quietly survive.

## License

MIT — see [LICENSE](LICENSE).
