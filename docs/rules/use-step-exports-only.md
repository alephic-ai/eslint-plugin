# @alephic-ai/use-step-exports-only

📝 In files that contain a 'use step' function, only step functions and type-only exports are allowed, and module-level statements must be pure. Non-step exports and side-effectful top-level statements survive the Workflow DevKit's step-stubbing and drag the file's import chain into the workflow VM bundle.

💼 This rule is enabled in the ✅ `recommended` config.

<!-- end auto-generated rule header -->

Applies to projects using the
[Workflow DevKit](https://github.com/vercel/workflow): in any file containing a
`'use step'` function, only step functions and type-only exports are allowed,
and module-level statements must be pure (function/class declarations and pure
literal initializers).

Non-step exports and side-effectful top-level statements survive the Workflow
DevKit's step-stubbing and drag the file's whole import chain (e.g. `db` → `pg`)
into the workflow VM bundle. The fix pattern is to move non-step logic into a
sibling module.

The rule does nothing in files without a `'use step'` function.

Side effects are detected as top-level (or static class-field) statements
containing a call, `new`, `await`, tagged template, assignment, or
increment/decrement expression, plus side-effect-only imports
(`import './x'`).

Re-exports of bindings declared in the same file are resolved semantically
(a step is a function whose body starts with `'use step'`). Cross-file
re-exports (`export { x } from './y'`) and re-exports of imported bindings
can't be resolved, so the rule falls back to the `*Step` naming convention on
the **exported** name: `export { foo as barStep } from './y'` is treated as a
step, `export { fooStep as bar } from './y'` is not.

## Examples

❌ Incorrect:

```ts
export async function fooStep() {
  'use step'
  return 1
}

export function plainHelper() {
  // non-step value export
  return 2
}

const KNOWN = new Set(['a']) // side-effectful module-level statement
```

✅ Correct:

```ts
export async function fooStep() {
  'use step'
  return 1
}

export type FooResult = { ok: boolean } // type-only exports are fine
const N = 3 // pure literal initializers are fine
```
