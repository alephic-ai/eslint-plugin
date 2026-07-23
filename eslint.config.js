// @ts-check

import js from '@eslint/js'
import eslintPluginPlugin from 'eslint-plugin-eslint-plugin'
import { importX } from 'eslint-plugin-import-x'
import nodePlugin from 'eslint-plugin-n'
import { configs as perfectionistConfigs } from 'eslint-plugin-perfectionist'
import { defineConfig, globalIgnores } from 'eslint/config'
import { configs as tsConfigs } from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist/**', 'coverage/**']),
  js.configs.recommended,
  tsConfigs.recommendedTypeChecked,
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
    rules: {
      // TypeScript sources import extensionless / package-resolved paths that
      // eslint-plugin-n's resolver does not follow.
      'n/no-missing-import': 'off',
    },
  },
])
