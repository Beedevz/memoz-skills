<!-- GENERATED from core/parallel-work.md — do not edit. Run: node scripts/render.mjs -->

# Memoz parallel work

# Parallel work

Run several pieces of work at once without them colliding — and without trusting any agent's
report, including your own.

This is the **orchestrator's** side. The people (or agents) doing the work have their own rules;
the orchestrator is the one who decides what runs in parallel, verifies what comes back, and asks
the human for approval. Most coordination mistakes happen on this side. *Observed in the pilot —
the trial run this protocol was written from; the notes below cite it the same way.*

## The shape

**One piece of work = one worktree = one branch = one task note.**

| role | does | never does |
|---|---|---|
| **implementer** | the work, in its own worktree; verifies by measuring; writes its report into the task note | push · merge · change the task's status · write checkpoints · touch files outside its declared set |
| **reviewer** | reads the diff independently and adversarially: "what contract does this break that the compiler and tests cannot see?"; returns its report as its last message | changes code · opens the task note (its independence depends on not reading the implementer's report) |
| **orchestrator** | splits the work, checks overlap, starts agents, **re-verifies every claim**, pushes, asks the human | forwards a report without checking it · writes the fix itself |

The human approves: overlap, merges, anything outward-facing.

## Task note fields

The task note carries the coordination state, so it survives a lost session:

| field | meaning |
|---|---|
| `branch` | the branch this work lives on |
| `worktree` | absolute path of its worktree |
| `files` | the paths this work claims — the overlap check reads this |
| `stage` | `implementing` → `agent-review` → `verified` (then `status: review` = waiting for the human) |

**One `doing` per worktree.** Two active tasks in one working directory cannot be told apart.

The lifecycle — `status` and `stage` values, the checkpoint after each step, the closure — is the
task-flow skill's; here it runs per piece. **The orchestrator writes each piece's checkpoints**
into that piece's note, before the next step, after each of: a commit it has verified (the
implementer's own commits are checkpointed here, when the orchestrator verifies them) · a reviewer
report recorded · the branch pushed · a stage changed · a decision by the human · a merge/pull
request opened · a merge.

## 1. Before anything starts

- [ ] **Settle which knowledge-layer server serves the project's declared vault** (`.memoz/tasks.json` → `vault`). A server reports the vault it serves when it connects (see the task-flow skill). With several vaults connected, each under its own name, a name alone does not tell you — so, in this order:
  1. the server whose reported vault **matches** → use it;
  2. none matches, and **exactly one** server reports no vault → use it, and say so;
  3. otherwise (no candidate, or several that do not report) → **ask the human**. Picking one of several unreporting servers is the wrong-vault risk this step exists to remove.

  Every agent that touches notes gets this server named in its prompt.
- [ ] Write a task note per piece, still `status: todo`: scope, contracts, *Not Doing* and `files`.
- [ ] Intersect the pieces written in this batch with each other. List the other `doing` and `review` tasks, and intersect the `files` of those that carry them with each piece's, and with the project's **hot files** (`hotFiles` in `.memoz/tasks.json` — shared files and how each is resolved). A task without `files` (single-session work) cannot be intersected — list it for the human instead of claiming no overlap.
- [ ] ⚠️ **An empty `doing` list does not mean nobody is on it.** Work started outside this protocol has no task note, so the step above cannot see it. Also look for open merge/pull requests and remote branches touching the same files (`git fetch --prune`, then the forge's list of open requests). Show the human everything found — your own pieces' branches and requests included — and let them decide (the task-flow skill's §4). Do the listing every time: a request can stay open for hours without touching the task notes, and one listing is enough to show it.
- [ ] ⛔ **If they intersect, do not start in parallel — ask the human.** Show, for each shared file: which pieces touch it, whether it is a hot file and how it resolves, the proposed merge order, and what running them one after another would cost. Run in parallel only on approval; otherwise run them in sequence. No intersection and nothing left un-intersected → no approval needed (just say so).
  ⚠️ "It is a hot file, it regenerates" does **not** replace approval. That a resolution exists does not mean the collision was accepted — and the first resolution proposed for a hot file can be wrong. *Observed in the pilot.*
- [ ] Only then, per piece: create the worktree from the up-to-date base branch, and in one write set its note to `status: doing`, `stage: implementing`, `branch`, `worktree`. Install dependencies there (a fresh worktree has none).
- [ ] **Read how your tools resolve paths.** A script with the repository path written into it will, when run from a worktree, modify the *main* checkout. Give agents copies that resolve from the current directory, and test each one against a known positive.
- [ ] ⚠️ **Return your own shell to the main checkout before starting an agent.** Sub-agents inherit the orchestrator's working directory: a shell left in one piece's worktree starts the next agent inside another piece's work. *Observed in the pilot.*

## 2. Starting the agents

- [ ] **Parallel work is started only here, by the orchestrator.** A piece handed to a separate, unsupervised session — a background session, a "start this in its own session" shortcut — has no task note, no overlap check, no reviewer and no merge order. If a piece is not ready to run under this protocol, it becomes a `todo` task (see the task-flow skill), not a side session.
- [ ] **Implementer prompt:** task-note path · the knowledge-layer server to use · worktree · branch · tool paths · where the measured traps are written down · verification commands · commit conventions · "no push".
- [ ] **Reviewer prompt:** the scope **in the prompt** (goal · contract risks · *Not Doing* · hot files) · the diff range · "do not open the task note". Its value comes from not carrying the implementer's assumptions. A rule like "skip the report section" is only as good as the tool that does the skipping, and that tool can misfire; "never open it" is enforceable, "read part of it" is not. *Observed in the pilot.*
- [ ] **Model:** risky contract work → the stronger model; mechanical work → the cheaper one. Reviewer: the stronger one.
- [ ] Parallel pieces start together; background them.

## 3. When results come back — verify, do not forward

- [ ] **Where is the implementer's report?** If it could not reach the note, its last message carries the full report — record it through the server you settled on. If it stopped because that server reports a *different* vault than the declared one, your settling was wrong: settle again (§1) before recording anything.
- [ ] **Is the tree actually clean?** ⚠️ An empty result is not a clean result: `git status | wc -l` printing `0` also happens when the command errored. Take the exit code, or look for something that is always there (a known positive) in the same query. An implementer can report "done" with its last edit never committed, and this check is what shows it. *Observed in the pilot.*
- [ ] **Does the diff stay inside `files`?** Anything outside is either a scope change the human should hear about, or a mistake.
- [ ] **Re-measure the key claims yourself** — counts, "zero left", "tests unchanged". Compare test *counts* before and after, not just pass/fail: a renamed test file that stops being discovered still leaves the suite green.
- [ ] `stage: agent-review` → start the reviewer.
- [ ] **Reproduce every finding yourself** (command + output). For every suspicion or "not a finding" note, ask whether a cheap measurement exists — a note filed as "not a finding" can turn out, under a mutation, to be a missing lock. *Observed in the pilot.*
- [ ] ⚠️ **Check the reviewer's reasoning too, not only its conclusion.** A finding can be right for the wrong reason ("this was already like that on the base branch" — it was not).
- [ ] **Record the reviewer's report in the task note yourself**, verbatim, through the server you settled on, and mark each finding *reproduced* or *not reproduced*. The reviewer role carries no knowledge-layer tools on purpose: a server name fixed in a tool list follows one vault, not the project.
- [ ] **Send the fix back to the implementer** — its context is still there. Do not write the fix yourself: then nobody verifies it.
- [ ] Verify the follow-up commit as well (only the requested files? does the mutation die now?) → `stage: verified`.

## 4. Push and merge

- [ ] Push from the worktree **normally**, so the hooks run. Never skip hooks.
- [ ] After pushing, confirm the remote head is the new commit. ⚠️ Filtering push output through a pipe can cut the push short; write it to a file, then read it.
- [ ] **Pieces that share a hot file merge in the agreed order.** The later one takes the base branch and runs every `regenerate` command — **whether or not git reported a conflict**. Git merging a hot file cleanly does not mean the file's own contract (sorted, unique, generated) still holds.
  ⚠️ **If the hot file is a gate's baseline, the clean merge and the regenerate step are baseline writes** — and they are yours, not the implementer's. The same rule as its own writes: run the gate in *check* mode first, have every **new** violation fixed (by the piece's implementer, §3) and run *check* again, and write only when the sole complaint is "cleaned up but not tightened". A write mode writes whatever it finds, so a violation regenerated into the baseline turns the gate green. A new violation that falls in no piece's `files` → stop and ask the human; do not write a fix yourself.
- [ ] Describe the change for the human: what, which contracts remain, reviewer findings and how they were verified, measurements. Then set the task to `status: review`.

## 5. Closing

- [ ] Close each piece with the closure skill, then set the closed status the human chose. Who may close a piece in `review` is settled in one place: the task-flow skill.
- [ ] Ask the human how to classify each candidate recurring mistake — new shape, or another occurrence of an existing one — and record it (see the recurring-mistake log).
- [ ] Remove merged worktrees and their local branches — with the human's approval, after confirming each is clean and its branch is on the base branch.
