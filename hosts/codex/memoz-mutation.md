<!-- GENERATED from core/mutation.md — do not edit. Run: node scripts/render.mjs -->

# Memoz mutation discipline

# Mutation discipline

A passing test is not proof of a lock. Break the thing on purpose and watch the test fail.

When you add a test that claims to prevent a specific defect, that claim is unverified until you
have seen the test **fail for the right reason**. Undo the fix, or introduce the defect the test
describes, and run it. If it still passes, the test does not lock what you think it locks.

## Three outcomes, not two

This is where the discipline is usually lost. "The mutation survived" is reported as one thing
when it is three, and treating them alike produces false confidence in both directions.

| outcome | meaning | what to do |
|---|---|---|
| **Died** | the test failed as expected | the lock is real |
| **Survived** | the mutation applied, and every test still passed | **the lock is fake** — fix the test, not the code |
| **Not applied** | it did not compile, or the pattern never matched | **not a result.** Nothing was tested |

⚠️ *Not applied* is the dangerous one, because it looks like *died* from a distance: the run is
green either way when you only glance at the exit code. Before concluding anything, confirm the
mutation actually landed — that the text was replaced, that the build used the changed file.

⚠️ A mutation that survives is not a reason to delete the test. It is the test telling you it was
checking the wrong thing, in the wrong place, or at the wrong moment.

## Timing-shaped false locks

A test that waits for a condition can pass **before** the change under test has taken effect —
the assertion is checked once against the old state, sees the expected value, and returns
immediately. It will pass with the fix and pass without it.

The tell is that the mutation survives while the assertion looks obviously correct.

The fix is to synchronise on something that **changes**: wait for the old state to disappear
before asserting the new one. Waiting for something that is expected to stay the same is not
waiting at all.

## What to mutate

Mutate the **claim**, not the code at random:

- the specific line the fix changed
- the boundary the test names — an ordering, a comparison, a default
- the wiring, not only the logic: a correct function that nothing calls passes every unit test

⚠️ If you cannot think of a mutation that would break the test, the test probably asserts
something that was always true.

## Say it plainly

Report mutation results with the count and the outcome of each — including the ones that were
*not applied*, and what you did about them. A summary that says only "tests pass" hides exactly
the information this discipline exists to produce.

⚠️ This skill describes the discipline; it cannot enforce it. Enforcement belongs in a hook or a
CI gate — something that runs whether or not anyone remembered. Guidance that depends on being
recalled is guidance, not a guarantee.
