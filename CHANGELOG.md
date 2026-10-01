# @alephic-ai/eslint-plugin

## 0.2.0

### Minor Changes

- [#12](https://github.com/alephic-ai/eslint-plugin/pull/12)
  [`020628a`](https://github.com/alephic-ai/eslint-plugin/commit/020628ada336fda9940dccc93328361885940e16)
  Thanks [@lra](https://github.com/lra)! - - Remove the `use-step-exports-only`
  rule and drop it from the `recommended` config. It guessed from source which
  step-file code gets pulled into the Workflow DevKit VM bundle and was wrong in
  both directions: it flagged code that never reaches the bundle and missed
  classes and self-recursive helpers that do. Any config or `eslint-disable`
  comment that still names `@alephic/use-step-exports-only` now fails with
  "Definition for rule ... was not found", so delete those references before
  upgrading. To catch server-only imports in the workflow bundle, check that the
  built bundle actually loads instead.

## 0.1.3

### Patch Changes

- - Fix use-step-exports-only to stop flagging step retry config
    (`fooStep.maxRetries = N`), exported overload signatures, and literal `Set`s
    as non-step exports
    ([#10](https://github.com/alephic-ai/eslint-plugin/issues/10))

## 0.1.2

### Patch Changes

- [#7](https://github.com/alephic-ai/eslint-plugin/pull/7)
  [`4a8b94e`](https://github.com/alephic-ai/eslint-plugin/commit/4a8b94e78b515fb64f37d4cac1b1b926899ed2c7)
  Thanks [@gmathieu](https://github.com/gmathieu)! - Fix type compatibility with
  ESLint's `defineConfig`

## 0.1.1

### Patch Changes

- [#4](https://github.com/alephic-ai/eslint-plugin/pull/4)
  [`d01e0b7`](https://github.com/alephic-ai/eslint-plugin/commit/d01e0b74e3bb7f3d4d117791e0ac0379dd27532f)
  Thanks [@gmathieu](https://github.com/gmathieu)! - Renamed the package from
  `@alephic-ai/eslint-plugin` to `@alephic/eslint-plugin` so it installs from
  public npm without any `.npmrc` registry configuration (the `@alephic-ai`
  scope is mapped to GitHub Packages in consuming repos, which requires auth
  even for public packages). The ESLint plugin namespace and rule IDs change
  accordingly: `@alephic-ai/<rule>` → `@alephic/<rule>`.

## 0.1.0

### Minor Changes

- [#1](https://github.com/alephic-ai/eslint-plugin/pull/1)
  [`9eb985f`](https://github.com/alephic-ai/eslint-plugin/commit/9eb985fc041e7e8d8438e721bf11c7c005a014e8)
  Thanks [@gmathieu](https://github.com/gmathieu)! - Initial release
