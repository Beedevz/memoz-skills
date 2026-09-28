<!-- GENERATED from core/parallel-work.md — do not edit. Run: node scripts/render.mjs -->

# Memoz parallel work

# Parallel work

Run several pieces of work at once without them colliding — and without trusting any agent's
report, including your own.

This is the **orchestrator's** side. The people (or agents) doing the work have their own rules;
the orchestrator is the one who decides what runs in parallel, verifies what comes back, and asks
the human for approval. In the pilot that produced this text, most mistakes happened on this side,
and this side was the one that was not written down.

## The shape

**One piece of work = one worktree = one branch = one task note.**

| role | does | never does |
|---|---|---|
| **implementer** | the work, in its own worktree; verifies by measuring; writes its report into the task note | push · merge · change the task's status · touch files outside its declared set |
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

## 1. Before anything starts

- [ ] **Settle which knowledge-layer server serves the project's declared vault** (`.memoz/tasks.json` → `vault`). A server reports the vault it serves when it connects (see the task-flow skill). With several vaults connected, each under its own name, a name alone does not tell you — so, in this order:
  1. the server whose reported vault **matches** → use it;
  2. none matches, and **exactly one** server reports no vault → use it, and say so;
  3. otherwise (no candidate, or several that do not report) → **ask the human**. Picking one of several unreporting servers is the wrong-vault risk this step exists to remove.

  Every agent that touches notes gets this server named in its prompt.
- [ ] Write a task note per piece: `status: doing`, `branch`, `worktree`, `files`, `stage: implementing`. Scope, contracts and *Not Doing* go in the note.
- [ ] List the other `doing` tasks. Intersect their `files` with this one's, and with the project's **hot files** (`hotFiles` in `.memoz/tasks.json` — shared files and how each is resolved).
- [ ] ⚠️ **An empty `doing` list does not mean nobody is on it.** Work started outside this protocol has no task note, so the step above cannot see it. Also look for open merge/pull requests and remote branches touching the same files (`git fetch --prune`, then the forge's list of open requests). Found one → stop and tell the human. In the case that produced this step, the other request had been open for hours; one listing would have shown it.
- [ ] ⛔ **If they intersect, do not start in parallel — ask the human.** Show, for each shared file: which pieces touch it, whether it is a hot file and how it resolves, the proposed merge order, and what running them one after another would cost. Run in parallel only on approval; otherwise run them in sequence. No intersection → no approval needed (just say so).
  ⚠️ "It is a hot file, it regenerates" does **not** replace approval. That a resolution exists does not mean the collision was accepted — and the first resolution proposed for a hot file in the pilot turned out to be wrong.
- [ ] Create the worktree from the up-to-date base branch; install dependencies there (a fresh worktree has none).
- [ ] **Read how your tools resolve paths.** A script with the repository path written into it will, when run from a worktree, modify the *main* checkout. Give agents copies that resolve from the current directory, and test each one against a known positive.
- [ ] ⚠️ **Return your own shell to the main checkout before starting an agent.** Sub-agents inherit the orchestrator's working directory. In the pilot an implementer woke up inside another piece's worktree.

## 2. Starting the agents

- [ ] **Parallel work is started only here, by the orchestrator.** A piece handed to a separate, unsupervised session — a background session, a "start this in its own session" shortcut — has no task note, no overlap check, no reviewer and no merge order. If a piece is not ready to run under this protocol, it becomes a `todo` task (see the task-flow skill), not a side session.
- [ ] **Implementer prompt:** task-note path · the knowledge-layer server to use · worktree · branch · tool paths · where the measured traps are written down · verification commands · commit conventions · "no push".
- [ ] **Reviewer prompt:** the scope **in the prompt** (goal · contract risks · *Not Doing* · hot files) · the diff range · "do not open the task note". Its value comes from not carrying the implementer's assumptions; a rule like "skip the report section" failed in the pilot because the tool used to skip it misfired. "Never open it" is enforceable; "read part of it" is not.
- [ ] **Model:** risky contract work → the stronger model; mechanical work → the cheaper one. Reviewer: the stronger one.
- [ ] Parallel pieces start together; background them.

## 3. When results come back — verify, do not forward

- [ ] **Where is the implementer's report?** If it could not reach the note, its last message carries the full report — record it through the server you settled on. If it stopped because that server reports a *different* vault than the declared one, your settling was wrong: settle again (§1) before recording anything.
- [ ] **Is the tree actually clean?** ⚠️ An empty result is not a clean result: `git status | wc -l` printing `0` also happens when the command errored. Take the exit code, or look for something that is always there (a known positive) in the same query. In the pilot this caught an implementer that reported "done" with its last edit never committed.
- [ ] **Does the diff stay inside `files`?** Anything outside is either a scope change the human should hear about, or a mistake.
- [ ] **Re-measure the key claims yourself** — counts, "zero left", "tests unchanged". Compare test *counts* before and after, not just pass/fail: a renamed test file that stops being discovered still leaves the suite green.
- [ ] `stage: agent-review` → start the reviewer.
- [ ] **Reproduce every finding yourself** (command + output). For every suspicion or "not a finding" note, ask whether a cheap measurement exists — in the pilot a note the reviewer filed as "not a finding" turned out, under a mutation, to be a missing lock.
- [ ] ⚠️ **Check the reviewer's reasoning too, not only its conclusion.** A finding can be right for the wrong reason ("this was already like that on the base branch" — it was not).
- [ ] **Record the reviewer's report in the task note yourself**, verbatim, through the server you settled on, and mark each finding *reproduced* or *not reproduced*. The reviewer role carries no knowledge-layer tools on purpose: a server name fixed in a tool list follows one vault, not the project.
- [ ] **Send the fix back to the implementer** — its context is still there. Do not write the fix yourself: then nobody verifies it.
- [ ] Verify the follow-up commit as well (only the requested files? does the mutation die now?) → `stage: verified`.

## 4. Push and merge

- [ ] Push from the worktree **normally**, so the hooks run. Never skip hooks.
- [ ] After pushing, confirm the remote head is the new commit. ⚠️ Filtering push output through a pipe can cut the push short; write it to a file, then read it.
- [ ] **Pieces that share a hot file merge in the agreed order.** The later one takes the base branch and runs every `regenerate` command — **whether or not git reported a conflict**. Git merging a hot file cleanly does not mean the file's own contract (sorted, unique, generated) still holds.
- [ ] Describe the change for the human: what, which contracts remain, reviewer findings and how they were verified, measurements. Then set the task to `status: review`.

## 5. Closing

- [ ] Ask the human how to classify each candidate recurring mistake — new shape, or another occurrence of an existing one — and record it (see the recurring-mistake log).
- [ ] Remove merged worktrees and their local branches — with the human's approval, after confirming each is clean and its branch is on the base branch.

## Measured in the pilot

- The reviewer found at least one real, verified problem in most runs — including a regression the implementer's green tests could not see (a CLI that swallowed a renamed flag) and blind spots in the very gate that was supposed to enforce the rule.
- A hot file two parallel pieces both appended to: in the one real run, the additions were far apart and git merged the file on its own. A conflict was produced only in a **simulation** with adjacent additions, and there the regenerate command resolved it correctly — a real conflict has not yet been observed. The regenerate step is mandatory after every merge either way.
- Most orchestrator-side mistakes were measurement mistakes: a pipe that swallowed an exit code, a shell alias that parsed flags differently, an empty result read as clean.
