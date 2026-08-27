<!-- GENERATED from core/decision.md — do not edit. Run: node scripts/render.mjs -->

# Memoz decision record

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
| **Known limits** | what this decision makes harder, or does not solve |
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

## Do not merge it into the work record

A decision outlives the task that produced it and is read by work that has nothing to do with
that task. It belongs in the knowledge layer, linked from the task — not buried in a checklist
that will be marked done and never opened again.

## Where it goes

The project's knowledge layer. Read the declaration (`.memoz/tasks.json`) for where that is; ask
if it is missing rather than choosing a location.
