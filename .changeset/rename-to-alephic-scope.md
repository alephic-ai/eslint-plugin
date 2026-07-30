---
'@alephic/eslint-plugin': patch
---

Renamed the package from `@alephic-ai/eslint-plugin` to `@alephic/eslint-plugin` so it installs from public npm without any `.npmrc` registry configuration (the `@alephic-ai` scope is mapped to GitHub Packages in consuming repos, which requires auth even for public packages). The ESLint plugin namespace and rule IDs change accordingly: `@alephic-ai/<rule>` → `@alephic/<rule>`.
