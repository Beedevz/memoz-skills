# Brainstorming

Work out what is actually wanted, and what has already been settled, before writing anything.

Run this before building a feature, changing behaviour, or picking an approach. It ends in a
**decision record**, not in code and not only in a conversation.

## 1. Ask the knowledge layer first

Before generating a single option, search the project's knowledge layer for prior decisions on
this topic.

This is the step a generic brainstorm cannot take, and it pays twice:

- **A settled question stays settled.** If a decision record exists, surface it — with the
  observation it named as grounds for reopening. Reopening is then a deliberate act, not an
  accident of forgetting.
- **A rejected option is not proposed again.** If it was dropped for a reason, the reason is
  visible. If that reason has since expired, say so out loud — an expired constraint is the best
  argument for revisiting, and a much better one than not having noticed.

⚠️ If nothing is found, say that too. "No prior decision found" is information: it tells the user
either that this is new ground, or that a past decision was never written down — and the second
is worth knowing before repeating it.

## 2. Understand the intent before the solution

Ask what problem this solves and for whom. A request usually arrives as a solution already
chosen; the useful move is to find the need underneath it, because the chosen solution may not
be the only one that meets it — or the need may already be met.

**One question at a time.** A list of five questions gets one answer covering two of them, and
the other three are quietly dropped.

## 3. Widen before narrowing

Produce genuinely different options, not one option and two strawmen. If every alternative is
obviously worse, the set is decoration and the decision was made before the discussion started.

For each option, name what it costs — not only what it gives. An option with no stated cost has
not been thought about.

⚠️ Include the option of doing nothing, or doing less. It is frequently the right one and almost
never on the list.

## 4. Name the constraints that decide it

Most choices are settled by a constraint rather than a preference: something that must keep
working, a migration nobody can afford, a deadline, a contract with existing data.

Find them and say them. A decision that rests on taste will be re-litigated; one that rests on a
constraint will not — until the constraint changes, which is exactly when it should be.

## 5. Stop at the decision

Do not start implementing. The output of this process is a decision the user has agreed with,
and the record of it:

- **the decision**, in one sentence
- **the options rejected**, each with the ground it was rejected on
- **the open questions** that were not resolved — written down rather than dropped
- **what would reopen it**

Hand the last four to the decision-record skill; do not invent a second format for the same
thing.

⚠️ Open questions are the part most often lost. A question that surfaced during a discussion and
was never answered does not disappear — it comes back as a surprise during implementation. Write
it down while it is still cheap.

## Where it goes

The project's knowledge layer. Read the declaration (`.memoz/tasks.json`) for where that is; ask
if it is missing rather than choosing.
