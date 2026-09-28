<!-- GENERATED from core/pattern-log.md — do not edit. Run: node scripts/render.mjs -->

# Memoz recurring-mistake log

# Recurring-mistake log

Keep one place where mistakes that repeat are written down, with a count.

A mistake made once is an incident. The same mistake made three times is a **property of how the
work is done**, and it will keep costing until something structural changes. The only way to tell
the two apart is to count.

## When to write

When you notice that something that just went wrong has gone wrong before. Not every bug — bugs
belong in the work record. This log is for the *shape* of the mistake, the thing that will recur
in a different file next month.

Typical shapes, as a prompt rather than a menu:

- a check that exists but never runs, or whose result nobody reads
- a test that passes while the thing it claims to lock is broken
- a measurement tool that misreports, so the conclusion drawn from it is wrong
- a document that states something the code stopped doing
- a default that is unsafe, so forgetting a flag causes damage
- the same decision copied to several places, where copies drift apart silently

## New entry, or another occurrence?

**Ask. Do not decide alone.**

Merging a new shape into an existing entry loses the distinction that made it new. Splitting one
shape into two entries splits its count, and a count split in half stops crossing the threshold
that would have triggered action.

When it is an existing entry: add the occurrence with its date and **what was different this
time**. "Happened again" is not worth writing; the variation is the information.

## Promotion is the user's call, not a counter's

The count is there so the user can see what keeps coming back. It does not trigger anything by
itself. Automatic promotion — "seen twice, so build a stronger check" — was tried and dropped: the
checks multiplied, and more time went into handling what they reported than into the work. By
default a repeated shape is **recorded as an instruction (L1) at most**, and nothing more is built
unless the user asks.

The ladder, for when the user does ask:

| level | who catches it next time | lives in | weakness |
|---|---|---|---|
| **L0 — record** | nobody; it is remembered | this log | someone has to read it and recall it |
| **L1 — required step** | whoever does the work, because their instructions say so | an agent role, a skill, a verification checklist | a step can be skipped or done wrong |
| **L2 — automatic gate** | a machine — test, hook, CI | the repository | costly to build; must be **proven by mutation** |

- **Seen again while already at a level** is worth saying to the user, with the count — a rule
  that exists and did not prevent the repeat may not be enough. Whether to go a step up is theirs
  to decide; do not propose a gate as the default answer to a pattern.
- **L2 is the expensive step.** Build one only when the user asks, and only for a mistake that
  caused real damage (lost work, a broken release, lost data, a leaked secret). Every gate has to
  be maintained, and its false alarms are paid for by whoever is doing the actual work.
- **L2 means the gate catches the shape itself**, and that is shown by putting the mistake back on
  purpose and watching the gate turn red. A hook that only checks whether someone *declared* they
  mutated is an automated reminder — L1, not L2. A regression test pinning one incident is a lock
  on that incident, not on the shape.
- **Measure the gate before you trust it.** A gate that enumerates what it inspects — node kinds,
  file types, fields — sees only what is on its list. In practice a counting gate turned out to be
  blind to sixteen declaration kinds, discovered a few at a time; its first completeness test was
  itself a list of one field. Write down, in the gate, what it does **not** see.
- **Measure the rule before you write it.** A proposed L1 step that said "run the shadow analyser"
  would have been blind: measured, the analyser stayed silent on exactly the kind of case that
  prompted it. A blind rule is worse than none — it reassures without protecting.
- Record a promotion in the entry: `Level: Lx — <where>`, with why this level and why not higher.
  A project may declare an automatic threshold of its own; by default there is none.

Who decides: whoever found the mistake writes it down as a *candidate*; the classification (new
shape or another occurrence) and the promotion are **the user's call**; then the promotion is
carried out — the log entry, and a change to the role, skill or gate if it is L1 or L2.

## Keep the count in one place

The count lives with the entry. Not in a summary elsewhere, not repeated in a project file — a
copied count goes stale on the next occurrence and then quietly argues for inaction.

⚠️ If you find the same count in two places, that is itself an occurrence of the copies-drift
shape. Log it.

## Write what would let you recognise it early

An entry earns its place by being recognisable *before* the damage next time. That means:

- what was believed at the moment of the mistake — not the correct explanation found afterwards
- what made it look fine — the reason it survived review
- what actually surfaced it, and how much later
- what would have caught it earlier, if anything would have

⚠️ The tempting thing to write is the diagnosis. The useful thing is the **disguise**: the
mistake will not introduce itself by name next time.

## Where it goes

One note in the project's knowledge layer, appended to over time. Read the project's declaration
(`.memoz/tasks.json`) for where that is; ask if it is missing.

⚠️ Keep it in a single note rather than one note per mistake. The value is in reading the list
and noticing that entries three, seven and eleven are the same illness — which cannot happen if
they live in separate files nobody opens together.
