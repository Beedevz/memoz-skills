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
