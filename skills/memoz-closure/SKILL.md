---
name: memoz-closure
description: "Write the closure record when a piece of work finishes: what changed, decisions and rejected options, measurements with their conditions, falsified assumptions, and criteria that could not be closed. Use when finishing a task, sub-task or release. Refuses to close on a missing field."
---

<!-- GENERATED from core/closure.md — do not edit. Run: node scripts/render.mjs -->

# Closing work

Write down what was learned before the context that produced it is gone.

Run this when a piece of work is finished — a sub-task, a task, a release. Not at the end of a
session: a session boundary is arbitrary, and the record would be about time rather than work.

## Refuse to close on a missing field

A closure record is not a summary. It is the answer to the question someone will ask in six
months, when the code is still here and the reasons are not. Ask for each field. If one cannot be
filled, say which and why — **do not fill it with something plausible.**

| field | what it holds |
|---|---|
| **What changed** | before and after. Concrete enough to disagree with |
| **Decisions and why** | including **which options were rejected and on what grounds** |
| **Measurements, with conditions** | a number alone lies: on what machine, what data, warm or cold |
| **Falsified assumptions** | what you believed at the start and no longer believe |
| **Reverted** | what was shipped and taken back |
| **Handed off** | what moved elsewhere, and why it moved rather than got dropped |
| **Criteria you could not close** | marked as unclosed, **each with its reason** |

### Falsified assumptions is the one that pays

It is the field people skip, and the one worth the most. What you confirmed mostly tells you what
you already thought. What was falsified is the part that changes the next decision.

If nothing was falsified, write that explicitly — *"nothing I assumed turned out wrong"* — rather
than leaving the field out. Stating it makes the claim visible, and a visible claim can be
challenged. A missing field just looks like haste.

⚠️ In practice this is rarely true. If a piece of work took a day and falsified nothing, the more
likely explanation is that assumptions were never made explicit enough to fail.

### Rejected options belong with the decision

A decision recorded without its alternatives reads, later, as the only thing anyone thought of.
The next person re-opens the same debate from scratch — or worse, quietly picks the option that
was already rejected for a reason nobody wrote down.

### Unclosed criteria stay visible

An unmet criterion is written as unmet, with the reason. Presenting it as done is the most
expensive mistake available here: it removes the only signal that would have prompted anyone to
finish it.

⚠️ "It works on my machine but I could not test it properly" is a reason. "I ran out of time" is
a reason. Both are worth writing. Silence is not.

## Two levels, two places

| closing | where the record goes |
|---|---|
| **A sub-task** | inside its own record — the lesson is small and concerns only that work |
| **A parent task** | a separate record in the knowledge layer, linked from the task |

The second is read by *other* work; it belongs where reasons live, not buried in a checklist.

Which layout a project uses is something to read from the project, not impose.

## Do not write it for the user

Ask the questions. Offer what you observed — commands you ran, numbers you measured, what broke
and what you changed. But the assumptions that were falsified are the user's to state; inventing
them produces a confident record of something nobody actually learned, which is worse than a
short one.

## Where it goes

The record belongs in the project's knowledge layer, next to the work it explains — a note in a
vault, or the task file itself when there is no vault. Read the project's declaration
(`.memoz/tasks.json`) for where that is; if it is missing, ask rather than choosing.

⚠️ Write the record **before** marking the work done. Once the status changes, the pressure to
write it is gone and the detail goes with it.
