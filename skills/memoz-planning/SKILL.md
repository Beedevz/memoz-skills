---
name: memoz-planning
description: "Break understood work into pieces that can be closed one at a time, each with a completion criterion you can actually run, plus the exclusions and the open questions. Use after the approach is settled and before implementing."
---

<!-- GENERATED from core/planning.md — do not edit. Run: node scripts/render.mjs -->

# Writing a plan

Break work that is already understood into pieces that can be closed one at a time.

Run this after the intent and the approach are settled — not before. Planning an ill-understood
problem produces a confident list of the wrong steps.

## Size the pieces by what can be finished

Aim for a handful of sub-tasks. Each one should be:

- **finishable in one sitting** — a piece that spans days hides its own drift
- **independently verifiable** — it produces something that can be shown to work on its own
- **ordered by dependency**, with the ones that can run in parallel marked as such

Too few pieces usually means the work was not decomposed, only renamed. Too many usually means
the work itself should be split, and that is worth saying rather than absorbing.

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

## Leave the plan where the work is tracked

The plan is not a separate artefact. It is the set of tasks the project already tracks: each
piece a task with its criteria and its exclusions, in whatever form that project uses. Read the
declaration (`.memoz/tasks.json`) for where that is; ask if it is missing.

⚠️ Do not invent a second place for the plan to live. A plan kept beside the task list becomes
the version nobody updates, and then the two disagree about what is finished.
