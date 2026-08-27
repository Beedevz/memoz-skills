# Verification before completion

Produce the evidence before making the claim. "Done", "fixed" and "it works" are claims.

Run this before saying a piece of work is finished, before committing, and before reporting a
result to anyone.

## The claim and the check must be the same thing

This is where verification usually fails — not by skipping the check, but by running a check that
does not cover the claim.

Write the claim as a sentence, then ask what output would be different if it were false. If you
cannot name one, you have not verified anything yet.

⚠️ Two ways this goes wrong, both of which feel like diligence at the time:

- **Verifying the part instead of the whole.** A rule was checked in isolation and reported as
  working; running the thing that *uses* the rule then failed for reasons the rule never touched.
- **Verifying by reading.** Text that reads correctly is not text that behaves correctly. Reading
  is how a wrong rule survives review; running is how it is found.

## Run it, do not reason about it

If the claim is that a command works, run the command. If it is that a file installs, install it.
If it is that a check catches a mistake, make the mistake and watch it get caught.

Reasoning is what produced the thing being verified. Using the same reasoning to check it tests
nothing that was not already assumed.

## Check the instrument agreed to run

A green result is only evidence if work actually happened:

- a cached or skipped run reports success, faster, and looks the same in the summary
- a filter or pipe can hide a non-zero exit status
- a build can use a stale artefact and pass on the previous version of the code
- a change that never applied is indistinguishable from a change that made no difference

Confirm the work ran — a count, a duration, a fresh timestamp — before treating the outcome as
evidence.

## Report what you did not verify

Whatever could not be checked is part of the result, not an omission from it. Say which claim is
unverified and why; a stated gap can be closed by someone else, an unstated one cannot.

⚠️ "All tests pass" answers a narrower question than "this works" and is often offered as though
it answered the wider one. If the wider claim was not tested, say so.

## Then, and only then, report

State what was run, what came back, and what remains unverified. The claim comes after the
evidence — in that order, because reversing it invites the evidence to be shaped to fit.

## Where it goes

The evidence belongs in the record of the work, with the conditions it was produced under. Read
the project's declaration (`.memoz/tasks.json`) for where that lives; ask if it is missing.
