// @ts-check

import js from '@eslint/js'
import eslintPluginPlugin from 'eslint-plugin-eslint-plugin'
import { importX } from 'eslint-plugin-import-x'
import nodePlugin from 'eslint-plugin-n'
import { configs as perfectionistConfigs } from 'eslint-plugin-perfectionist'
import { defineConfig, globalIgnores } from 'eslint/config'
import { configs as tsConfigs } from 'typescript-eslint'

import alephicPlugin from './src/index.ts'

export default defineConfig([
  globalIgnores(['dist/**', 'coverage/**']),
  js.configs.recommended,
  tsConfigs.recommendedTypeChecked,
  // Dogfooding doubles as a compile-time regression test: this `// @ts-check`ed
  // file passes the plugin straight to `defineConfig`, so `tsc6` fails if the
  // exported types stop being assignable to eslint's own `Plugin`/config types.
  // The explicit `plugins` entry is the exact consumer pattern that once broke;
  // `configs.recommended` alone would not exercise that assignment.
  { plugins: { '@alephic': alephicPlugin } },
  alephicPlugin.configs.recommended,
  eslintPluginPlugin.configs.recommended,
  nodePlugin.configs['flat/recommended'],
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  perfectionistConfigs['recommended-natural'],
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
])
