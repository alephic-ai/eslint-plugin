import type { ESLint, Linter } from 'eslint'

import packageJson from '../package.json' with { type: 'json' }
import { rule as symmetricNeverExclusions } from './rules/symmetric-never-exclusions.ts'
import { rule as testExercisesCode } from './rules/test-exercises-code.ts'
import { rule as useStepExportsOnly } from './rules/use-step-exports-only.ts'

const rules = {
  'symmetric-never-exclusions': symmetricNeverExclusions,
  'test-exercises-code': testExercisesCode,
  'use-step-exports-only': useStepExportsOnly,
}

// `configs.recommended` must reference the plugin object itself, so the
// plugin is created first and its configs are populated afterwards — the
// pattern documented at
// https://eslint.org/docs/latest/extend/plugins#configs-in-plugins
const recommended: Linter.Config[] = []

// `satisfies ESLint.Plugin` cannot work here: TSESLint's `RuleModule` is not
// structurally assignable to @eslint/core's `RuleDefinition`, which eslint's
// own `Plugin` (and therefore `defineConfig`) expects. Intersecting instead
// keeps the precise rule types for tooling while making the export usable in
// eslint's config types — the approach eslint-plugin-import-x takes.
const plugin = {
  configs: { recommended },
  meta: {
    name: packageJson.name,
    namespace: '@alephic',
    version: packageJson.version,
  },
  rules,
} as ESLint.Plugin & {
  configs: { recommended: Linter.Config[] }
  rules: typeof rules
}

recommended.push({
  name: '@alephic/recommended',
  plugins: { '@alephic': plugin },
  rules: {
    '@alephic/symmetric-never-exclusions': 'error',
    '@alephic/test-exercises-code': 'error',
    '@alephic/use-step-exports-only': 'error',
  } satisfies Record<`@alephic/${keyof typeof rules}`, 'error' | 'off'>, // prevent rules from being forgotten
})

export default plugin
