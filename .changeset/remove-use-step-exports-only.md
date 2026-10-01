---
'@alephic/eslint-plugin': minor
---

- Remove the `use-step-exports-only` rule and drop it from the `recommended` config. It guessed from source which step-file code gets pulled into the Workflow DevKit VM bundle and was wrong in both directions: it flagged code that never reaches the bundle and missed classes and self-recursive helpers that do. Any config or `eslint-disable` comment that still names `@alephic/use-step-exports-only` now fails with "Definition for rule ... was not found", so delete those references before upgrading. To catch server-only imports in the workflow bundle, check that the built bundle actually loads instead.
