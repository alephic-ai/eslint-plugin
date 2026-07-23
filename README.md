# @alephic-ai/eslint-plugin

Alephic's custom ESLint rules.

## Installation

```bash
pnpm add -D @alephic-ai/eslint-plugin
```

Requires ESLint >= 9 (flat config).

## Usage

```js
// eslint.config.js
import alephic from '@alephic-ai/eslint-plugin'
import { defineConfig } from 'eslint/config'

export default defineConfig([...alephic.configs.recommended])
```

Or configure rules individually:

```js
import alephic from '@alephic-ai/eslint-plugin'
import { defineConfig } from 'eslint/config'

export default defineConfig([
  {
    plugins: { '@alephic-ai': alephic },
    rules: {
      '@alephic-ai/symmetric-never-exclusions': 'error',
    },
  },
])
```

## Rules

<!-- begin auto-generated rules list -->

💼 Configurations enabled in.\
✅ Set in the `recommended` configuration.\
🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).

| Name                                                                   | Description                                                                                                                                                                                                                                                                                                      | 💼 | 🔧 |
| :--------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :- | :- |
| [symmetric-never-exclusions](docs/rules/symmetric-never-exclusions.md) | Enforce symmetric ?: never exclusions in discriminated union types                                                                                                                                                                                                                                               | ✅  | 🔧 |
| [test-exercises-code](docs/rules/test-exercises-code.md)               | Require test describe/it titles to name identifiers that the file actually references, so tests exercise the real code instead of a parallel reimplementation.                                                                                                                                                   | ✅  |    |
| [use-step-exports-only](docs/rules/use-step-exports-only.md)           | In files that contain a 'use step' function, only step functions and type-only exports are allowed, and module-level statements must be pure. Non-step exports and side-effectful top-level statements survive the Workflow DevKit's step-stubbing and drag the file's import chain into the workflow VM bundle. | ✅  |    |

<!-- end auto-generated rules list -->

## Contributing

```bash
pnpm install
pnpm test    # vitest rule-tester suites (watch mode locally, single run in CI)
pnpm lint    # eslint --fix + prettier --write + typecheck
pnpm build   # tsdown → dist/ (ESM)
pnpm build && pnpm eslint-doc-generator   # regenerate rules docs
```

New rules go in `src/rules/<rule-name>.ts` with a colocated
`<rule-name>.test.ts` and a `docs/rules/<rule-name>.md` page, and must be
registered in `src/index.ts` (both `rules` and `configs.recommended` — default
severity is `error`). After adding or editing a rule, run
`pnpm build && pnpm eslint-doc-generator` to regenerate the README rules table
and `docs/rules` headers (the generator loads the plugin from `dist/`); CI
fails if they're stale.

## Publishing an update

Releases are automated with
[changesets](https://github.com/changesets/changesets):

1. In your PR, run `pnpm changeset` and pick a bump. Adding or tightening a rule
   is **breaking for consumers** (new CI failures) — use a major bump for that
   once past 1.0; bug fixes that only remove false positives are a patch.
2. Merge the PR. The release job in `ci.yml` opens (or updates) a
   `chore: release` PR that accumulates pending changesets and their changelog
   entries.
3. Merge the release PR. Once the CI job passes on main, the release job
   publishes the new version to npmjs (via trusted publishing/OIDC, with
   provenance) and re-publishes the identical tarball to GitHub Packages so
   repos whose `.npmrc` maps `@alephic-ai` to `npm.pkg.github.com` resolve the
   same version.

No npm tokens are involved: npmjs trusts the `ci.yml` workflow directly, and
the GitHub Packages publish uses the workflow's ephemeral `GITHUB_TOKEN`.

## License

MIT
