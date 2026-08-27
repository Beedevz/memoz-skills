<!-- GENERATED from core/task-flow.md — do not edit. Run: node scripts/render.mjs -->

# Memoz task flow

# Task flow

Find the active task, work on exactly one, and never invent where work lives.

## 1. Read the declaration

```bash
cat .memoz/tasks.json 2>/dev/null
```

| field | meaning | if missing |
|---|---|---|
| `prefix` | task-id prefix — `SP` · `BZW` · `ABC`. Ids are `<prefix>-<N>` | **ask** |
| `backend` | `vault` \| `repo` — where work is tracked | **ask** |
| `vault` | which vault (`backend: vault`) | **ask** |
| `folder` | scope inside the vault | vault root |
| `taskDir` | task directory (`backend: repo`) | `docs/tasks` |

- **File present** → follow the branch `backend` names. No guessing.
- **File missing → STOP and ASK.** Ask what the prefix is and where work is tracked. Create
  `.memoz/tasks.json` only with the user's approval, then continue. **Do not produce task files
  first.**

⚠️ **Why a declaration and not detection.** An earlier version inferred the backend from the
filesystem and was wrong twice. The second version picked the vault in *every* directory, because
an MCP server is reachable process-wide — so in an unrelated project it would silently adopt
**another project's** tasks, and the "neither is present, so ask" branch could never fire.
Reachability is a *capability*; ownership is a *declaration*.

⚠️ **Never hardcode a prefix.** `SP-` is wrong in a project that uses `BZW-1`. Read it every time.

## 2a. Vault backend

Query the tasks with the Memoz MCP tools, scoped by `folder`:

- `list_tasks(status: "doing")` → the active task. There should be exactly one.
- `list_tasks(status: "todo")` → what is queued.

- **One `doing`** → that is the focus. Read the note; scope and *Not Doing* live there.
- **More than one `doing`** → ask. Do not choose.
- **No `doing`** → show the `todo` list by priority and **ask**. Do not start on your own.
- Mark the chosen task `doing` before working.

⚠️ In this backend "active" is a **field**, not a filename. Searching for `*-active.md` is
meaningless here.

⚠️ Sub-tasks may be separate notes (`<prefix>-NN/T<k> — …`) or sections inside the parent note.
Both are valid — read which one this project uses; do not impose a shape.

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

⚠️ Step 2 is a bug fix. A version that looked only for `-active.md` reported "no active task" in a
repository holding ten live task files, and exited.

## 2c. Check that the backend actually serves the declared vault

When `backend` is `vault`, two settings answer the same question and they do **not** consult each
other: the `vault` field in the declaration, and the vault the data server was pointed at.

Before concluding that there is no work to do, check that they agree. A Memoz MCP server reports
the vault it is serving in the instructions it sends at connection time; compare that with the
declared `vault`.

- **They agree** → proceed.
- **They disagree** → **stop and tell the user.** Name both values; do not pick one.
- **The server does not report a vault** → say so once, then continue. Older servers do not
  report it, and treating silence as a mismatch would block every project running one.

⚠️ Not being able to check is not the same as failing the check. Conflating them turns a missing
capability into a wall — and the wall appears for exactly the users who have not updated yet,
which is most of them for most of the time.

⚠️ Never report "no tasks" on an unverified backend. This failure is silent by construction: the
server answers correctly, the query is well-formed, and the result is genuinely empty — because
it was asked in the wrong place. An empty answer and a wrong-place answer look identical, so the
only defence is checking before you conclude.

⚠️ Measured, not hypothetical: a server started without an explicit vault fell back to a
configured default that was a *different* vault, and the tooling reported "no work to do" while
the tasks were plainly visible in the app.

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

The session's scope is the selected task only. If you notice work missing elsewhere, note it —
do not start it. Respect the parent task's *Not Doing* list as a hard fence.

## 5. Verification commands come from the project

⚠️ **Never hardcode a language's tooling.** Look, in order, at `package.json` scripts
(`test` · `lint` · `typecheck`), `Makefile` targets, and the project's agent instructions file.
If you cannot find them, **ask**.

A version of this text had Go commands baked in and proposed them in a TypeScript repository.

## 6. Closing a sub-task

- Tick only the checkboxes that are genuinely done — **surgically**. Never round-trip a note
  through parse-and-serialize: it destroys comments, nested keys and anything non-flat.
- A criterion you could not close is written as `[~]` **with the reason**. Presenting it as closed
  is the most expensive mistake in this workflow.
- "Done" is the user's call. You report what was done and what appears finished.
- Never commit without showing the message first.
