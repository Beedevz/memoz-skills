# Task flow

Find the active task, work on exactly one, and never invent where work lives.

## The lifecycle

This skill is the entry point: it carries one task from start to close, and hands several pieces
at once to *parallel work*.

| phase | what happens | where |
|---|---|---|
| **Start** | read the declaration · pick one task · check it is not under way elsewhere · mark it `doing` with its `start`, `branch` and `worktree` | §1–§4 |
| **Work** | a checkpoint in the task record after every finished step | §5 |
| **Finish** | criteria ticked or `[~]` · the closure · the closed status, on the user's word | §7, then the closure skill |

`status` and `stage` exist **only in the vault backend** (§2a). Use these values; invent no others:

- `status`: `todo` → `doing` → `review` (waiting for the human: approval, merge) → the vault's
  closed status (`done`, `dropped`, … — read which ones the vault uses; never assume one).
- `stage`, while `doing`: `implementing` → `agent-review` (only when a reviewer agent runs) →
  `verified` (the verification passed **and** every criterion that can be met before the merge is
  `[x]`, or `[~]` with its reason; one that waits on a later event (a merge, a deploy, a later task)
  stays `[ ]` and is named in the `verified` checkpoint line — `[~]` is never a placeholder for a
  criterion that can still be met). A merge is a checkpoint line, not a stage. A closed task has
  **no** `stage` (§2d).

The shape of the record — the short card, the task's folder, and the `milestone` · `start` ·
`done` · `mr` fields — is §2d.

The repo backend (§2b) is outside the lifecycle: there a checkpoint is a ticked checkbox plus a
dated line in the task file (there is no card or `## Log` section there). Do not invent frontmatter for it.

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
| `milestones` | the path inside the vault that holds the milestone notes (`Milestones`, `Proj/Milestones`) — optional; not derived from `folder` | **ask**, when a milestone is needed |
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
  has merged, offer to close it — or report it, if §7 says so — before new work.
- `list_tasks(status: "todo")` → what is queued.

- **One `doing`** → that is the focus. Read the card and its brief (§2d): the criteria and *Not Doing* are on the card, the scope is in the brief.
- **More than one `doing`** → if the notes carry a `worktree` field, the focus is the one whose
  `worktree` is the current checkout (`git rev-parse --show-toplevel`). Compare **resolved** paths,
  not strings — a path through a symlink (`/tmp` → `/private/tmp` on macOS) names the same
  directory but does not compare equal. An empty `worktree` means the main checkout: compare it
  as the main checkout's resolved path. Otherwise — or if none or several match — **ask**. Do not
  choose.
- **No `doing`** → show the `todo` list by priority and **ask**. Do not start on your own.
- Check that the chosen task is not under way elsewhere (§4). **Starting** it (`todo` → `doing`):
  then, in one write, set `status: doing`, `stage: implementing`, `start` (§2d, the stamp rule),
  `branch`, and `worktree` — the resolved absolute path of the linked worktree you work in, or
  empty in the main checkout. If the tool that sets `status` does not stamp `start`, do not use it
  for this move: make it one hand edit of all these fields (§2d).
  **Resuming** a `doing` task: if it is a piece of parallel work and this is a new session, stop
  and ask the user how to continue first — before §4; otherwise the check in §4 runs too. It is
  not a move: leave `stage` and `start` as they are.

⚠️ In this backend "active" is a **field**, not a filename. Searching for `*-active.md` is
meaningless here.

⚠️ Sub-tasks may be separate notes (`<prefix>-NN/T<k> — …`) or sections inside the parent note.
Both are valid — read which one this project uses; do not impose a shape.

Every task note in progress carries `branch` and `worktree` as information — the check in §4
shows them to the user. A piece of parallel work also carries `files` (the paths it claims). The rule is **one
`doing` per worktree** — two active tasks in one working directory cannot be told apart. Under
parallel work only the orchestrator writes these fields, `status`, `stage`, `start`, `done`, `milestone`, `mr` and the
checkpoints; a
session resuming a piece stops and asks the user how to continue — before any other step, §4
included.

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

## 2d. The task card, its folder and its fields (vault backend)

A task note is a **card**: short enough to take in at a glance, because the task list, a status
band and the next session all read it. Its layout, in this order:

1. **Frontmatter** — the fields below.
2. **Goal** — one line.
3. **Links** — wikilinks to the task's brief, its decisions and its report (and the closure, once
   written, if that is a separate record). The link to the report note is added when that note
   first appears: by whoever creates it, or, under parallel work, by the orchestrator when it
   first records into it (an implementer does not edit the card).
4. **Completion criteria** — the checkboxes (§7).
5. **Not Doing** — the hard fence (§4).
6. **Log** — a level-2 heading `## Log`, holding one dated line per checkpoint
   (`YYYY-MM-DD — …`, §5), newest last. One line each, not a paragraph. Keep the heading exactly
   `## Log`: tooling reads the last dated line under a heading that starts with `Log` to tell
   whether a task has stalled, and a dated line anywhere else is not seen. The last touch is the
   newest of three sources: that Log line, the `start` stamp, and — where the vault records a
   change history (`.memoz/history/`) — a recent change of the task's `status`, `stage` or
   checkboxes (`~checkboxes`). So a task that is moving but has no new Log line is not called
   stalled; the Log line is still the record of what was done.

Why the task exists, its scope and what it changes do not fit in a goal line: they go to a
**brief**. Choices made while working the task go to **task decisions**; what the work reports
back goes to a **report** note. All of them live in the task's own folder — a folder named after
the task id, next to the card (where sub-task notes `<prefix>-NN/T<k> — …` live, if the project
uses them):

| note | name | holds |
|---|---|---|
| brief | `<prefix>-NN/<prefix>-NN brief` (a sub-task note with a scope of its own: `<prefix>-NN T<k> brief`; without one, the parent's brief is its brief) | why · scope · what changes |
| task decision | `<prefix>-NN/<prefix>-NN D<n> — <title>` (`D1`, `D2`, … counted inside this task); a sub-task piece's: `<prefix>-NN T<k> D<n> — <title>`, in the parent's folder, so numbers never collide | one decision, with the fields of the decision skill and a frontmatter `scope: task` (no `status`); one that also affects the project carries `scope: project` and keeps only its one-sentence *Decision* and a link to the project record (decision skill) |
| report | `<prefix>-NN/<prefix>-NN report` (a sub-task note: `<prefix>-NN T<k> report`, in the parent's folder — never the parent's report note, so two pieces never append to one note) | what comes back from the work, appended in order: implementer reports, reviewer reports (verbatim), and the closure when it is a *Closed* section (closure skill) |

**A brief is required for every task that has a scope.** Only a one-line fix is exempt — a task
whose whole scope fits in the goal line. The report note is created by whoever writes the first
report (after looking for it — never overwriting an existing one); a task with none yet has none.

A card that grows past a screen is a sign that a brief, a decision or a report is hiding in it:
move it out and leave a link. These notes carry **no `status`** — a note with a `status` in a
task's folder is a sub-task, and task lists count it as one. A decision that affects the whole
project is also recorded in the project's decisions place, the two linking each other (the
decision skill says how).

Fields. `status`, `stage`, `branch`, `worktree` and `files` are §2a; the dates, the milestone and
the merge request are these:

| field | meaning | who writes it, when |
|---|---|---|
| `milestone` | the milestone this task belongs to: its **id**, never a path. The id is a string: quote one that looks like a number (`milestone: "1.10"`, not `1.10`; a reader strips one matching pair of quotes). Write the id itself, never a link (`[[…]]`) | whoever creates the task (the planning skill); a task without one belongs to no milestone |
| `start` | the day work began (`YYYY-MM-DD`) | the stamp rule below: on a move to `doing`, in the same write as `status` (§2a) |
| `done` | the day work ended (`YYYY-MM-DD`) — the **only** end date | stamped on the move to the closed status (§7), in the same write |
| `due` | the optional **planned** date (`YYYY-MM-DD`) | the user; never invented |
| `mr` | the URL of the merge / pull request carrying the work; when there are several, an inline list: `mr: [url1, url2]` | the checkpoint in which the request was opened (§5) |

In a **task**, `start` is the day work *actually* began. In a **milestone** note the same-named
`start` and `due` are the *plan* (the planning skill).

**The stamp rule.** On a move to `doing`, write `start` (today) if it is empty; never overwrite a
`start` that is set; never write it without a move — a task already `doing` stays as it is, and a
`doing` task whose `start` is empty is not backfilled. On the move to the closed status, write
`done` and remove the `stage` line in the same write — a closed task has no stage. On a move from
a closed status back to an open one, remove `done` (so a later re-close stamps the new date instead
of keeping the first). A reopen to `todo` carries no `stage`. A reopen to `doing` is a start: follow
§2a *Starting* and §4 (branch, worktree, one `doing` per worktree, the concurrent-work check) and set
`stage: implementing` — or the stage the user names; a move from `review` back to `doing` for rework
sets `stage: implementing` too. If the status tool does not write the `stage`, write it right after
by a surgical hand edit; the read-back below confirms.

⚠️ Whether a status tool stamps `start` and `done` depends on the tool. One that does not (an
editor, a note written by hand — an agent editing the file is exactly that) leaves them empty, and
a field the writer skipped is not "unknown", it is a hole in every list that reads it. So: **a
tool that does not stamp is not used for the move on its own** — write `status` and the date (and
`stage`, `branch`, `worktree` when starting; `done` and the removal of `stage` when closing) in ONE
hand edit. After a move — by a stamping tool or by hand — read the note back and confirm that
`start` (on a move to `doing`) or `done` (on closing) is there, that after closing `stage` is gone,
that after a reopen `done` is gone, and that after a reopen to `doing` `stage` is set; write the
missing stamp or stage, or remove the stale `done` or `stage`, surgically if not. A hand edit is never done with a tool that replaces the whole note (an
`update_note`-style call): it is a surgical edit of the frontmatter lines it changes (a file
edit), or a status tool that stamps the field when there is one.

⚠️ Write no second end date (`end`, `finished`, …). A project that already has one keeps
reading it as a fallback when `done` is missing; new notes never get it.

⚠️ `milestone` names a note that must exist — the planning skill says where and how it looks. A
mistyped id silently creates a milestone nobody planned: list the existing ids before writing one,
and ask before inventing a new one.

The repo backend (§2b) keeps one file per task and no frontmatter: nothing here applies to it.

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
the record's `branch` and `worktree` stay as they are. Before working in that checkout on the
user's approval, show any `doing` task whose `worktree` is that checkout and ask — one `doing` per
worktree. An empty `worktree` is the main checkout (§2a).

If you notice work missing elsewhere, **record it as a task** where the declaration says work is
tracked — status `todo`. In a vault: a card (§2d: goal, criteria, *Not Doing*, the files it would
touch) and a brief that carries its scope; the repo backend records it in its own file form (§2b). With no
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
- if the step opened a merge/pull request, write its URL to `mr` (§2d) — append to the list when
  the task already has one — vault backend only;
- add one dated line with the observed result under the card's `## Log` heading (§2d), newest last
  — vault backend only; the repo backend has no card (§2b) —
  e.g. `2026-01-14 — opened #42; pipeline green at a1b2c3d`.

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
- **No `[ ]` is left behind at the close.** At `stage: verified` the lifecycle's rule applies. Before
  asking to close, none is `[ ]` (the closure skill lists them back): each is `[x]`, or `[~]` — the
  criterion will not be met inside this task, with its reason and where it went (a follow-up task,
  …); the user confirms it. ⚠️ A closed task is not a ticked task: closed notes kept unticked boxes and a stale `stage`,
  and the card then reads as unfinished work.
- A criterion you could not close is written as `[~]` **with the reason**. Presenting it as closed
  is the most expensive mistake in this workflow.
- Closing is the user's call. You report what was done and what appears finished.
- Never commit without showing the message first.
- Once the user agrees: write the closure (the closure skill says where it goes), then set the
  closed status the user chose — in that order. The move stamps `done` and removes `stage` (§2d);
  it clears nothing else.
- **A task in `review` may be closed from any session — only after asking the user.** Except a
  parallel piece: its orchestrator or the user closes it; any other session only reports it.
