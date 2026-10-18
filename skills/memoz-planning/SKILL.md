---
name: memoz-planning
description: "Plan understood work: one piece when it is small, pieces that can be closed one at a time when it really exceeds eight hours, each with a completion criterion you can actually run, plus the exclusions and the open questions. Use after the approach is settled and before implementing."
---

<!-- GENERATED from core/planning.md — do not edit. Run: node scripts/render.mjs -->

# Writing a plan

Plan work that is already understood: as one piece when it is small, split into pieces that can be
closed one at a time when it is large.

Run this after the intent and the approach are settled — not before. Planning an ill-understood
problem produces a confident list of the wrong steps.

## Split only work that is really large

Split work only when it really takes more than **eight hours of real-world working time** — the
time a person would spend doing it, not an agent's run time. Below that it stays **one piece**,
even when its parts could run in parallel: every split adds a card, a review and a merge, and on
small work that overhead costs more than the split saves.

When the work is that large, size each piece so that it is:

- **finishable within eight hours** — a piece that spans days hides its own drift
- **independently verifiable** — it produces something that can be shown to work on its own
- **ordered by dependency**, with the ones that can run in parallel marked as such

A piece that still exceeds the budget is split again. Small pieces are merged back only while the
merged piece stays within the budget. Count the pieces from the work, not from a target number.

## Write criteria you can actually run

Every completion criterion needs an answer to *"how would I run this?"* — a command, an
observation, a specific output. A criterion with no way to execute it is a wish, and wishes get
marked done by whoever wants to move on.

⚠️ Check this **while writing the criterion**, not while closing it. A criterion that turns out to
be unrunnable is usually discovered at the end, when the work is finished and the only remaining
options are to leave it open or to quietly pretend.

⚠️ Watch for criteria that assume the wrong kind of artefact. "Verify by breaking it and watching
the test fail" is a fine criterion for code and an impossible one for a document; the mismatch is
easy to miss because the sentence reads well either way.

## Say what is not being done

A plan without a boundary grows during execution, one reasonable addition at a time, and nobody
can point to the moment it changed. Write the exclusions down as part of the plan — including the
tempting ones, especially the tempting ones. An exclusion nobody was tempted by is not doing any
work.

## Carry the open questions forward

Anything unresolved from the discussion goes into the plan as an open question, attached to the
piece it affects. Questions that stay in the conversation reappear during implementation as
surprises, at the point where they are most expensive to answer.

## Put the pieces under a milestone (vault backend)

*This section and the next apply to the vault backend. The repo backend keeps one file per task
and no frontmatter; for it nothing here changes (task-flow, §2b).*

Work that ships together — a release, a version, a named effort — is grouped under a
**milestone**, so "what is left of this one" is a question the task list can answer. When the work
you are planning belongs to one, **every piece carries it**: `milestone: <id>` in each task's
frontmatter (the id itself, never a path and never a link `[[…]]`; quote an id that looks like a number:
`"1.10"`). A piece
planned without it falls out of the milestone's view and nobody notices.

A milestone is a note of its own, named by its id, in the folder the declaration's `milestones`
field names (`.memoz/tasks.json`; task-flow, §1): `<milestones>/<id>.md`. **If the field is
missing, ask the user where milestones live — do not guess, and do not derive it from `folder`**
(that is the project folder in some projects and the task folder in others, and a milestone filed
among the tasks mixes into the task lists). Whoever reads milestones finds them by `type: milestone`
and the file name.

```
---
type: milestone
start: 2026-10-12
due: 2026-11-30
---
# <id>
One line: what this milestone delivers.
```

- The template has no inline `#` comments, and neither should a real milestone note: readers
  parse each line with a regular expression and would keep the comment as part of the value.
- `start` and `due` (`YYYY-MM-DD`) are the **plan**, and they are the user's to give. Ask; never invent a date to
  fill the field — an invented `due` turns every overdue marker into noise. (In a task, `start` is
  the actual day work began — task-flow, §2d.)
- The **actual** dates are not written here. They come from the tasks: the first `start` among the
  milestone's tasks and the last `done` among its closed tasks, **leaving out `dropped` ones**
  in both (abandoned work neither began nor ended the milestone). Two copies of one fact drift.
- The id is unique within the milestones folder. Look there before choosing one, and use an
  existing id exactly as spelled — a near-miss makes a second milestone. If the milestone does not
  exist yet, create its note first (with the user's dates), then the tasks that name it.
- No milestone fits? Say so and ask; a task without a milestone is allowed, a guessed one is not.

## Give each piece a card and a brief (vault backend)

Each piece is a task **card**: frontmatter (with `milestone`), a one-line goal, links, completion
criteria, *Not Doing*, a `## Log` section of one-line dated entries. Task-flow, *The task card, its folder and its
fields*, has the layout. A piece that has a scope also gets a **brief** in the task's own folder
(`<prefix>-NN/<prefix>-NN brief`): why the piece exists, its scope, what it changes. The brief is
required; only a one-line fix whose scope fits in the goal line goes without. Write it now, while
the reasoning is fresh; the exclusions and the criteria stay on the card, because the card is what
gets checked, and the card links to the brief.

## Leave the plan where the work is tracked

The plan is not a separate artefact. It is the set of tasks the project already tracks: each
piece a task with its criteria and its exclusions, in whatever form that project uses (in a vault,
the card above). Read the
declaration (`.memoz/tasks.json`) for where that is; ask if it is missing.

⚠️ Do not invent a second place for the plan to live. A plan kept beside the task list becomes
the version nobody updates, and then the two disagree about what is finished.
