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
| `hotFiles` | files that parallel pieces of work tend to share, each with how a collision resolves: `regenerate` (+ `command`) or `serialize` | none — no file is treated as shared |

A `hotFiles` entry, for example: `{ "path": "docs/index.md", "resolve": "regenerate", "command": "npm run gen:index" }`.
`regenerate` means never merge it by hand — take either side and run the command. `serialize`
means pieces that touch it do not run in parallel without the user's approval. See
*parallel work*.

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

Query the tasks with the Memoz MCP tools, scoped by `folder` — through the server settled in
§2c. With more than one Memoz server connected, settle it **before** the first query: a query sent
to the wrong server answers correctly, about the wrong vault.

- `list_tasks(status: "doing")` → the active task — exactly one per working directory. Several
  are normal when work runs in parallel, each in its own worktree.
- `list_tasks(status: "todo")` → what is queued.

- **One `doing`** → that is the focus. Read the note; scope and *Not Doing* live there.
- **More than one `doing`** → if the notes carry a `worktree` field, the focus is the one whose
  `worktree` is the current checkout (`git rev-parse --show-toplevel`). Compare **resolved** paths,
  not strings — a path through a symlink (`/tmp` → `/private/tmp` on macOS) names the same
  directory but does not compare equal. Otherwise — or if none or several match — **ask**. Do not
  choose.
- **No `doing`** → show the `todo` list by priority and **ask**. Do not start on your own.
- Mark the chosen task `doing` before working.

⚠️ In this backend "active" is a **field**, not a filename. Searching for `*-active.md` is
meaningless here.

⚠️ Sub-tasks may be separate notes (`<prefix>-NN/T<k> — …`) or sections inside the parent note.
Both are valid — read which one this project uses; do not impose a shape.

When work runs in parallel, a task note also carries `branch`, `worktree`, `files` (the paths it
claims) and `stage` (`implementing` → `agent-review` → `verified`). The rule is **one `doing` per
worktree** — two active tasks in one working directory cannot be told apart. Only the orchestrator
writes these fields. See *parallel work*.

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
