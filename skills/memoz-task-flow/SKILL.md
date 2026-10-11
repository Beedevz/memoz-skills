---
name: memoz-task-flow
description: "Entry point for work in a project tracked with Memoz: find the active task from the project's .memoz/tasks.json declaration, work on exactly one, checkpoint its record after every step, close it, and route several pieces at once to parallel work. Use when starting, continuing or closing work. Never guesses where work lives."
---

<!-- GENERATED from core/task-flow.md — do not edit. Run: node scripts/render.mjs -->

# Task flow

Find the active task, work on exactly one, and never invent where work lives.

## The lifecycle

This skill is the entry point: it carries one task from start to close, and hands several pieces
at once to *parallel work*.

| phase | what happens | where |
|---|---|---|
| **Start** | read the declaration · pick one task · check it is not under way elsewhere · mark it `doing` with its `branch` and `worktree` | §1–§4 |
| **Work** | a checkpoint in the task record after every finished step | §5 |
| **Finish** | criteria ticked or `[~]` · the closure · the closed status, on the user's word | §7, then the closure skill |

`status` and `stage` exist **only in the vault backend** (§2a). Use these values; invent no others:

- `status`: `todo` → `doing` → `review` (waiting for the human: approval, merge) → the vault's
  closed status (`done`, `dropped`, … — read which ones the vault uses; never assume one).
- `stage`, while `doing`: `implementing` → `agent-review` (only when a reviewer agent runs) →
  `verified` (the verification passed). A merge is a checkpoint line, not a stage.

The repo backend (§2b) is outside the lifecycle: there a checkpoint is a ticked checkbox plus a
dated line in the task file. Do not invent frontmatter for it.

**Several pieces at once** — the user asks for more than one, or more than one ready task should
run together → *parallel work*. The lifecycle is the same per piece: each has its own task
record, branch and worktree, and the orchestrator writes each piece's checkpoints.

## 1. Read the declaration

```bash
cat .memoz/tasks.json 2>/dev/null
```

| field | meaning | if missing |
|---|---|---|
| `prefix` | task-id prefix — `ABC` · `XYZ`. Ids are `<prefix>-<N>` | **ask** |
| `backend` | `vault` \| `repo` — where work is tracked | **ask** |
| `vault` | which vault (`backend: vault`) | **ask** |
| `folder` | scope inside the vault | vault root |
| `taskDir` | task directory (`backend: repo`) | `docs/tasks` |
| `hotFiles` | files that parallel pieces of work tend to share, each with how a collision resolves: `regenerate` (+ `command`) or `serialize` | none — no file is treated as shared |

A `hotFiles` entry, for example: `{ "path": "docs/index.md", "resolve": "regenerate", "command": "npm run gen:index" }`.
`regenerate` means never merge it by hand — take either side and run the command. `serialize`
means pieces that touch it do not run in parallel without the user's approval. See
*parallel work*.

- **File present** → follow the branch `backend` names. No guessing.
- **File missing → STOP and ASK.** Ask what the prefix is and where work is tracked. Create
  `.memoz/tasks.json` only with the user's approval, then continue. **Do not produce task files
  first.**

⚠️ **Why a declaration and not detection.** An MCP server is reachable from every directory, so
detecting the backend from what is reachable would, in an unrelated project, silently adopt
**another project's** tasks.
Reachability is a *capability*; ownership is a *declaration*.

⚠️ **Never hardcode a prefix.** `ABC-` is wrong in a project that uses `XYZ-1`. Read it every time.

## 2a. Vault backend

Query the tasks with the Memoz MCP tools, scoped by `folder` — through the server settled in
§2c. With more than one Memoz server connected, settle it **before** the first query: a query sent
to the wrong server answers correctly, about the wrong vault.

- `list_tasks(status: "doing")` → the active task — exactly one per working directory. Several
  are normal when work runs in parallel, each in its own worktree.
- `list_tasks(status: "review")` → waiting for the human. List them for the user; for one that
  has merged, offer to close it (§7) before new work.
- `list_tasks(status: "todo")` → what is queued.

- **One `doing`** → that is the focus. Read the note; scope and *Not Doing* live there.
- **More than one `doing`** → if the notes carry a `worktree` field, the focus is the one whose
  `worktree` is the current checkout (`git rev-parse --show-toplevel`). Compare **resolved** paths,
  not strings — a path through a symlink (`/tmp` → `/private/tmp` on macOS) names the same
  directory but does not compare equal. Otherwise — or if none or several match — **ask**. Do not
  choose.
- **No `doing`** → show the `todo` list by priority and **ask**. Do not start on your own.
- Check that the chosen task is not under way elsewhere (§4). **Starting** it (`todo` → `doing`):
  then, in one write, set `status: doing`, `stage: implementing`, `branch`, and `worktree` — the
  resolved absolute path of the linked worktree you work in, or empty in the main checkout.
  **Resuming** a `doing` task: the check in §4 runs too; leave `stage` as it is.

⚠️ In this backend "active" is a **field**, not a filename. Searching for `*-active.md` is
meaningless here.

⚠️ Sub-tasks may be separate notes (`<prefix>-NN/T<k> — …`) or sections inside the parent note.
Both are valid — read which one this project uses; do not impose a shape.

Every task note in progress carries `branch` and `worktree` as information — the check in §4
shows them to the user. A piece of parallel work also carries `files` (the paths it claims). The rule is **one
`doing` per worktree** — two active tasks in one working directory cannot be told apart. Under
parallel work only the orchestrator writes these fields, `status`, `stage` and the checkpoints; a
session resuming a piece asks first whether it is the orchestrator (*parallel work* §1).

## 2b. Repo backend

```bash
find "<taskDir>" -name "<prefix>-*.md" -not -path '*/archived/*'
```

Two naming conventions exist and **both** must be recognised:

- `<prefix>-NN-active.md` → the suffix means active.
- `<prefix>-NN.md` → no suffix; activity is **not** encoded in the filename.

Decision order:

1. `-active.md` files exist → those are active. More than one → **ask**.
2. Otherwise, if `<prefix>-NN.md` files exist → activity cannot be read from the name: show the
   list and **ask** which one to work on. Do not choose.
3. Neither → say there is no active task and stop.

## 2c. Check that the backend actually serves the declared vault

When `backend` is `vault`, two settings answer the same question and they do **not** consult each
other: the `vault` field in the declaration, and the vault the data server was pointed at.

Before concluding that there is no work to do, check that they agree. A Memoz MCP server reports
the vault it is serving in the instructions it sends at connection time. It reports a **path**;
the declaration holds a vault **name**. A vault opened from a folder takes that folder's name, so
compare the name with the path's last segment — but a vault can be renamed, so a difference is a
reason to stop and show both values, not proof that the vault is wrong.

Several Memoz servers can be connected at once, each under its own name, each serving a different
vault. A server's name does not tell you which vault it serves, so look at what each one reports
and settle on one, in this order:

1. **A server reports the declared vault** → use it. (Two that report it serve the same vault;
   either will do.)
2. **None does, and exactly one server reports no vault** → use that one, and say so once. Older
   servers do not report a vault, and treating silence as a mismatch would block every project
   running one.
3. **None does, and no server is left to fall back on** — every server reports some other vault
   → **stop and tell the user.** Name the declared vault and every reported one; do not pick one.
4. **None does, and several servers report no vault** → **ask the user** which one serves the
   declared vault. Do not pick.

With a single server this reduces to: it agrees → proceed; it disagrees → stop; it is silent →
say so and continue.

⚠️ Not being able to check is not the same as failing the check. Conflating them turns a missing
capability into a wall — and the wall appears for exactly the users who have not updated yet,
which is most of them for most of the time.

⚠️ Case 4 is not the same as case 2. With one silent server, silence is the only thing it can
say — it is the server you have. With several, "continue" would mean choosing one of them, and a
wrong choice is exactly the silent failure this section exists to prevent: an empty `doing` list
from a vault that has no tasks, reported as "no work to do".

⚠️ Never report "no tasks" on an unverified backend. This failure is silent by construction: the
server answers correctly, the query is well-formed, and the result is genuinely empty — because
it was asked in the wrong place. An empty answer and a wrong-place answer look identical, so the
only defence is checking before you conclude.

⚠️ Observed: a server started without an explicit vault fell back to a configured default that
was a *different* vault, and the tooling reported "no work to do" while the tasks were plainly
visible in the app.

## 3. Reality check before writing code

Verify the selected task's checklist **against the code**, not against the checklist's own claims:

| task file | code | meaning |
|---|---|---|
| checked | present | consistent |
| unchecked | present | **drift** — the task file is stale |
| checked | absent | **drift** — wrongly marked |
| unchecked | absent | not done yet |

**Stop and report drift before continuing.** Do not silently reconcile it.

## 4. One task at a time

The session's scope is the selected task only. Respect the parent task's *Not Doing* list as a
hard fence.

**Check that it is not under way elsewhere — when you start or resume the task, not when the
session starts.** An empty `doing` list is not enough: look at `review` tasks too, and at remote
branches and open merge/pull requests touching the same files (`git fetch --prune`, then the
forge's list of open requests). Records that carry `files` are intersected with the files this
task touches; a record without `files` (single-session work) cannot be, so list it and the open
requests for the user instead of reporting no overlap.

**Nothing passes without being shown.** Show the user everything found — the task's own branch
and open request included, and every overlap — and let the user decide. A record does not say
which session works from it: a second session on the same task looks exactly like this one.
Continuing from a checkout other than the record's (compare resolved paths, §2a) → ask the user;
the record's `branch` and `worktree` stay as they are.

If you notice work missing elsewhere, **record it as a task** where the declaration says work is
tracked — status `todo`, with its scope, *Not Doing* and the files it would touch. With no
declaration, list it for the user and ask where it belongs. Do not start it — and do not hand it
to a separate session of its own either.

⚠️ Work started outside the task list is invisible to everyone who checks the task list,
including the overlap check in *parallel work* — the same defect can then be fixed twice, in
parallel, and one of the fixes thrown away.

## 5. Checkpoint after each step

When a step finishes — a commit, a merge/pull request opened, a merge, a measurement round, a
decision by the user — update the task record **before starting the next step**:

- tick the checkbox that is now done (surgically, §7);
- move `status` / `stage` if the step moved it (*The lifecycle*) — vault backend only;
- add one dated line with the observed result, e.g. `2026-01-14 — opened #42; pipeline green at a1b2c3d`.

Write from the result you observed — the output, the link, the commit — not from what you expected
the step to produce. A line written ahead of its result is a claim nobody checked.

If the record cannot be written — the knowledge layer is unreachable, the write is refused — say so
and **stop**. Do not continue untracked.

⚠️ A session can end after any step. The record is all that the next session — and the check in
§4 — will know about where the work stands.

## 6. Verification commands come from the project

⚠️ **Never hardcode a language's tooling.** Look, in order, at `package.json` scripts
(`test` · `lint` · `typecheck`), `Makefile` targets, and the project's agent instructions file.
If you cannot find them, **ask**.

## 7. Finishing: sub-tasks and the task

- Tick only the checkboxes that are genuinely done — **surgically**. Never round-trip a note
  through parse-and-serialize: it destroys comments, nested keys and anything non-flat.
- A criterion you could not close is written as `[~]` **with the reason**. Presenting it as closed
  is the most expensive mistake in this workflow.
- Closing is the user's call. You report what was done and what appears finished.
- Never commit without showing the message first.
- Once the user agrees: write the closure (the closure skill says where it goes), then set the
  closed status the user chose — in that order.
- **A task in `review` may be closed from any session — only after asking the user.**
