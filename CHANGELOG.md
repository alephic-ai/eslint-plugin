# @alephic-ai/eslint-plugin

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
