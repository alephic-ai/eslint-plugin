import type { TSESLint } from '@typescript-eslint/utils'

import packageJson from '../package.json' with { type: 'json' }
import { rule as symmetricNeverExclusions } from './rules/symmetric-never-exclusions'
import { rule as testExercisesCode } from './rules/test-exercises-code'
import { rule as useStepExportsOnly } from './rules/use-step-exports-only'

const rules = {
  'symmetric-never-exclusions': symmetricNeverExclusions,
  'test-exercises-code': testExercisesCode,
  'use-step-exports-only': useStepExportsOnly,
}

// `configs.recommended` must reference the plugin object itself, so the
// plugin is created first and its configs are assigned afterwards — the
// pattern documented at
// https://eslint.org/docs/latest/extend/plugins#configs-in-plugins
const plugin = {
  configs: {} as { recommended: TSESLint.FlatConfig.ConfigArray },
  meta: {
    name: packageJson.name,
    namespace: '@alephic',
    version: packageJson.version,
  },
  rules,
}

Object.assign(plugin.configs, {
  recommended: [
    {
      name: '@alephic/recommended',
      plugins: { '@alephic': plugin },
      rules: {
        '@alephic/symmetric-never-exclusions': 'error',
        '@alephic/test-exercises-code': 'error',
        '@alephic/use-step-exports-only': 'error',
      } satisfies Record<`@alephic/${keyof typeof rules}`, 'error' | 'off'>, // prevent rules from being forgotten
    },
  ] satisfies TSESLint.FlatConfig.ConfigArray,
})

export default plugin
