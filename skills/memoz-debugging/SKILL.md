---
name: memoz-debugging
description: "Find a defect by elimination and keep what the elimination taught: search the knowledge layer first, reproduce before explaining, write hypotheses down before testing them, never conclude from absence, distrust the instrument, and prove the cause by putting the bug back. Use on any failure whose cause is not obvious."
---

<!-- GENERATED from core/debugging.md — do not edit. Run: node scripts/render.mjs -->

# Systematic debugging

Find the cause by elimination, and keep what the elimination taught you.

Run this on any failure whose cause is not already obvious — a failing test, a wrong result, a
crash, something that works in one place and not another.

## 1. Ask the knowledge layer first

Search the project's knowledge layer for this failure's shape before theorising. A recurring
defect usually has a record: the disguise it wore last time, and what finally surfaced it.

If nothing is found, say so. It means either new ground, or a previous encounter that was never
written down.

## 2. Reproduce before explaining

An explanation for a failure you cannot trigger on demand cannot be tested, and will feel
convincing regardless of whether it is true. Get to a command or a sequence that fails reliably
first.

If it only fails sometimes, that is a finding: note what differs between the runs — order,
timing, state left behind, cached results.

## 3. Write the hypotheses down before testing them

List what could cause this, then knock them out one at a time. Writing them first matters: a
hypothesis held only in your head gets quietly abandoned when it becomes inconvenient, and later
re-proposed by someone else because nobody recorded that it was ruled out.

**Change one thing at a time.** Two changes and a passing test tell you nothing about which one
mattered — and often neither did.

## 4. Do not conclude from absence

"No results" and "I looked in the wrong place" are indistinguishable outputs.

Before concluding that something is not there, confirm your search would have found it if it
were: search for something you know exists in that location and check that it comes back. An
empty answer only means something once the method is known to work.

⚠️ This is not pedantry. Concluding from a silent, well-formed, entirely wrong query is one of
the easiest mistakes to make and one of the hardest to notice, because nothing about it looks
like an error.

## 5. Distrust the instrument

The tool reporting the result can be the thing that is wrong:

- a run that skipped its work reports success much faster, and looks the same in the summary line
- a wait that returns immediately checks the state *before* the change it was waiting for
- a filter or a pipe can swallow a non-zero exit and turn a failure into a clean-looking pass
- a change that never applied — a pattern that did not match, a build that used the old file —
  reads exactly like a change that made no difference

When a result surprises you, verify the instrument before believing the reading.

## 6. Prove the cause, do not just remove the symptom

Once you have a fix, put the bug back. The symptom must return. If it does not, you changed
something else and the real cause is still there, now hidden.

This is the same discipline as mutating a test, applied to the diagnosis: a fix that has not been
shown to be load-bearing is a coincidence.

## 7. Write down what was falsified

The wrong hypotheses are the durable output. The correct answer will be visible in the code once
it is fixed; the three plausible explanations that turned out to be wrong will not be, and
without them the next person walks the same three paths.

If the failure's *shape* has appeared before, promote it: add an occurrence to the recurring-
mistake log with what was different this time, rather than filing a fresh unrelated record.

## Where it goes

The root cause and the falsified hypotheses go in the record of the work. A recurring shape goes
in the recurring-mistake log. Read the project's declaration (`.memoz/tasks.json`) for where
those live; ask if it is missing.
