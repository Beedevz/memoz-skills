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

**Gemini CLI**

```bash
gemini skills install https://github.com/Beedevz/memoz-skills.git --path skills/memoz-task-flow
```

> The install itself works, but Gemini CLI now refuses to sign in on individual Gemini Code
> Assist accounts and points users to the Antigravity suite. If that applies to you, use the
> Antigravity command above instead.

**Claude Code** — copy a skill directory into `~/.claude/skills/` (user scope) or
`.claude/skills/` (project scope). A packaged plugin is planned.

**Codex CLI** — copy the rendered prompt into `~/.codex/prompts/`. See `hosts/codex/`.

> Data access is separate: Memoz ships an MCP server. Connect it from the Memoz app
> (Settings → MCP) for Claude Desktop/Code, Codex, Gemini, Cursor, VS Code.

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

More are planned: closure writer (mandatory *falsified assumptions* field), pattern log,
mutation discipline, decision/friction/measurement capture.

## Layout

```
core/     host-agnostic discipline text — the single source
skills/   SKILL.md form (Claude Code + Gemini CLI share this shape)
hosts/    per-host renders that are not SKILL.md (e.g. Codex prompts)
```

`skills/` and `hosts/` are **generated from `core/`** — do not hand-edit them. Agent instructions
maintained separately per host drift apart quickly, and the drift is silent: the same command
behaves differently depending on which tool you happen to be using. One source, rendered per host.

```bash
node scripts/render.mjs
```

## License

MIT — see [LICENSE](LICENSE).
