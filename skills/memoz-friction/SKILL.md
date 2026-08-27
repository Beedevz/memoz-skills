---
name: memoz-friction
description: "Record what got in the way while using something: goal, what happened, what you expected, the workaround, and the decision. Use at the moment of friction, not at the end of the session."
---

<!-- GENERATED from core/friction.md — do not edit. Run: node scripts/render.mjs -->

# Friction record

Write down what got in the way, while you still remember how it felt.

Friction is the cost you pay repeatedly and stop noticing. Working around something for the third
time feels like competence; it is usually a defect that never got reported because each
individual instance was small enough to absorb.

## Fields

| field | what it holds |
|---|---|
| **What you were trying to do** | the goal, not the symptom |
| **What happened** | including the exact message, if there was one |
| **What you expected** | this is what makes it friction rather than a preference |
| **The workaround** | what you did to get past it, if anything |
| **Decision** | fix it now · file it as work · accept it, **with the reason** |

## Expectation is the field that carries the report

Without it there is only a complaint. With it, a reader can judge whether the tool is wrong or
the expectation was — and both outcomes are useful. If the expectation was wrong, that is a
documentation defect, which is a real defect.

## Accepting is a valid decision, silence is not

Not everything is worth fixing. Accepting friction is fine, and writing *why* is what makes it
different from ignoring it: the reason can be re-examined when the cost changes.

⚠️ The reason should be about cost, not about capability. "Not worth the change for one person" is
a reason. "Nobody has complained" is not — you are complaining right now.

## Record it at the moment, not at the end

By the end of the session the workaround feels normal and the surprise is gone. What made it
friction — the moment of *"wait, why did it do that?"* — is exactly what will not survive to the
retrospective.

## Watch for the third time

Friction that recurs stops being friction and becomes a property of the system. If you find
yourself writing a record that resembles one already there, that resemblance is the finding:
promote it, rather than filing another instance.

⚠️ Recurring *shapes* belong in the recurring-mistake log with a count. This record is for the
individual encounter.

## Where it goes

The project's knowledge layer. Read the declaration (`.memoz/tasks.json`) for where that is; ask
if it is missing rather than choosing.
