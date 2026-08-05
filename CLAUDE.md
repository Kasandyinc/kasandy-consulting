
## The no-regression rule

`lib/regression.test.ts` holds executable contracts for behaviour that has been
confirmed working. It runs with `npm test`.

- A behaviour confirmed working gets an invariant there **in the same commit**.
- Removing an invariant requires saying in the commit message what replaced it.
- A failing contract is a regression to fix, never a test to update.

It exists because a green build is not evidence of correctness. Every defect it
guards against compiled, type-checked, passed the suite and deployed: a step key
the database rejected, a page nothing linked to, a server action with no auth,
a middleware gate that counted a cookie instead of verifying it.

The shape is always the same — two statements of one fact, drifting apart. Nothing
else in the toolchain checks that they still agree.
