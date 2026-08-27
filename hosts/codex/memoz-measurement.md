<!-- GENERATED from core/measurement.md — do not edit. Run: node scripts/render.mjs -->

# Memoz measurement record

# Measurement record

A number without its conditions is not a measurement. Record both, or record neither.

## Fields

| field | what it holds |
|---|---|
| **What was measured** | the quantity, precisely enough to repeat |
| **The number** | with its unit |
| **Conditions** | machine, data, cache state, configuration, date |
| **How it was produced** | the command, so someone can run it again |
| **What it does not show** | the question this number cannot answer |

## Conditions are not metadata

The same benchmark on a warm cache and a cold one are different measurements that happen to share
a name. Six months later nobody remembers which one this was, and the number gets quoted in an
argument it does not support.

State at minimum: what machine, what data set or corpus, and whether caches were warm. If the
tooling has a mode that skips work when nothing changed, say whether that mode was on — a run
that did nothing completes very fast and reports success.

⚠️ Watch for tools that report success for work they did not do. A cached "pass" and a real pass
look identical in the summary line. When timing something, force the work.

## Say what the number does not show

A measurement invites a conclusion wider than it supports. Write the boundary down while you
still know it: measured on one machine, one corpus, one configuration.

⚠️ This is the field that prevents a correct number from being used as a wrong argument, which is
more common than measuring wrongly.

## Measure before optimising, and after

A change made without a before-number cannot be shown to have helped, and will not be reverted
when it turns out not to have. If the gain cannot be demonstrated, the change should come out.

## Where it goes

The project's knowledge layer, linked from the work that prompted it. Read the declaration
(`.memoz/tasks.json`) for where that is; ask if it is missing.

⚠️ Keep the number in one place. A figure copied into a summary is stale on the next measurement,
and the stale copy is the one people quote.
