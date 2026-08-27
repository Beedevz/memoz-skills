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

**If the file is missing, the skills stop and ask.** They never guess.

That rule is not politeness — it is a bug fix. An earlier version inferred the backend from the
filesystem and got it wrong twice. The second time it picked the vault in *every* directory,
because an MCP server is reachable process-wide: run it in an unrelated project and it would
quietly adopt **another project's** tasks. Reachability is a *capability*; ownership is a
*declaration*, and only the project can make it.

## Skills

| skill | what it enforces |
|---|---|
| `memoz-task-flow` | Find the active task from the declaration; never invent task files |
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
Each ends by writing into your knowledge layer: a process that leaves no trace is a conversation,
not a record.

## Layout

```
core/            host-agnostic discipline text — the single source
plugin.json      plugin identity — the single source for every manifest
skills/          SKILL.md form (Claude Code + Gemini CLI + Antigravity share this shape)
hosts/           per-host renders that are not SKILL.md (e.g. Codex prompts)
.claude-plugin/  Claude Code plugin + marketplace manifests
```

`skills/`, `hosts/` and `.claude-plugin/` are **generated** — do not hand-edit them. Agent instructions
maintained separately per host drift apart quickly, and the drift is silent: the same command
behaves differently depending on which tool you happen to be using. One source, rendered per host.

```bash
node scripts/render.mjs   # regenerate
node scripts/check.mjs    # fail if the generated files drift from core/
```

`check.mjs` runs in CI, so a hand-edit cannot quietly survive.

## License

MIT — see [LICENSE](LICENSE).
