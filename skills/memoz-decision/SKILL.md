---
name: memoz-decision
description: "Record a decision together with the options rejected and the ground each was rejected on, plus what observation would reopen it. Use when a choice is made that outlives the task, or a choice inside a task worth keeping beside it."
---

<!-- GENERATED from core/decision.md — do not edit. Run: node scripts/render.mjs -->

# Decision record

Write down what was decided, and what was rejected, while the alternatives are still in view.

A decision recorded alone reads, months later, as the only thing anyone thought of. The next
person re-opens the same debate from nothing — or quietly adopts the option that was already
rejected, for a reason nobody wrote down.

## Fields

| field | what it holds |
|---|---|
| **Decision** | one sentence, in the present tense: what is true from now on |
| **Rejected options** | each with the ground it was rejected on — **not "we preferred X"** |
| **Known limits** | what this decision makes harder, or does not solve — the chosen option's cost |
| **Open questions** | what is still undecided, and who decides it — "none" is an answer |
| **What would reopen it** | the observation that should make someone revisit this |

## Rejected options are the body of the record

The decision itself is usually the least surprising part; whoever reads it can often guess it.
The value is in the options that were considered and dropped, because those are what someone will
propose again.

⚠️ A rejection needs a **ground**, not a preference. "We chose A over B" records a taste. "B was
rejected because it required a migration on both sides for a change that ships in one" records a
constraint — and that constraint may not hold next year, which is exactly when the decision
should be revisited.

## Name what would reopen it

Write the observation that should overturn the decision, **before** anyone has an interest in the
answer. Deciding afterwards what counts as evidence is how a decision becomes unfalsifiable.

Make it something countable where you can: *"if this comes up twice more"*, *"if the number goes
above X"*. A threshold nobody can evaluate is a decoration.

⚠️ Where the count is kept matters. Keep it with the decision. A count copied elsewhere goes stale
and then argues, silently, for doing nothing.

## Task decision or project decision

Ask who will need the decision after this task is closed.

| the decision… | goes to |
|---|---|
| matters only to this task — a choice inside its scope | a **task decision**: its own note in the task's folder, `<prefix>-NN/<prefix>-NN D<n> — <title>` (`D1`, `D2`, … counted inside the task; a sub-task piece's: `<prefix>-NN T<k> D<n> — <title>`, in the parent's folder, so numbering cannot collide), linked from the card |
| changes how the project works, or will be read by other work | the project's decisions place (below), **and** a task decision in the task's folder |

The two kinds are linked **both ways**: the project record names the task that produced it, and the
task decision links the project record. Write the full record (every field above) once, in the
project's decisions place, and keep the task decision to its one-sentence *Decision* and the link —
the copy that is kept in full is the one that stays true. Not sure which kind it is? Treat it as a
project decision: a task decision that turns out to matter has to be found again, a project
decision filed under a task cannot be.

A task decision carries no `status` (it is not a task), and no number outside its task — numbering
is per task (per sub-task piece, for a sub-task), so there is no "next free number" to track.

Besides the usual vault fields (such as `tags`), it carries a `scope` field: `scope: task` for a
decision that matters only to its task, `scope: project` for one that also affects the project (the
one kept to its one-sentence *Decision* and the link). Write exactly `task` or `project`,
lowercase. Not sure which? Treat it as a project decision: write the project record, and this note
with its one-sentence *Decision*, the link and `scope: project`. Put no inline `#` comment on the
`scope` line: readers take the rest of the line as the value, so `scope: project  # also in
Decisions` is not `project`.

## Do not merge it into the work record

A decision outlives the task that produced it and is read by work that has nothing to do with
that task. It belongs in the knowledge layer, linked from the task — not buried in a checklist
that will be marked done and never opened again. A task decision written as its own note in the task's
folder is not buried: the card links it, and the card stays short.

## Where it goes

The project's knowledge layer. Read the declaration (`.memoz/tasks.json`) for where that is; ask
if it is missing rather than choosing a location. A task decision (above) goes in the task's own
folder inside it.
