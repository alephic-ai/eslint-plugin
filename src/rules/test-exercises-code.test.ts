import { RuleTester } from '@typescript-eslint/rule-tester'
import { afterAll, describe, it } from 'vitest'

import { rule } from './test-exercises-code'

RuleTester.afterAll = afterAll
RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester()

ruleTester.run('test-exercises-code', rule, {
  invalid: [
    {
      code: `
        import { describe, it, expect } from 'vitest'
        describe('fetchFooStep', () => {
          it('does a thing', () => { expect(1).toBe(1) })
        })
      `,
      errors: [{ data: { name: 'fetchFooStep' }, messageId: 'notReferenced' }],
      name: 'camelCase identifier in describe title not referenced',
    },
    {
      code: `
        import { describe, it, expect } from 'vitest'
        describe('downloadSlackFilesStep logic', () => {
          it('skips oversized files', () => { expect(1).toBe(1) })
        })
      `,
      errors: [
        {
          data: { name: 'downloadSlackFilesStep' },
          messageId: 'notReferenced',
        },
      ],
      name: 'camelCase identifier with trailing prose',
    },
    {
      code: `
        import { describe, it, expect } from 'vitest'
        describe('SlackFileRef preserves fields', () => {
          it('works', () => { expect(1).toBe(1) })
        })
      `,
      errors: [{ data: { name: 'SlackFileRef' }, messageId: 'notReferenced' }],
      name: 'PascalCase identifier not referenced',
    },
    {
      code: `
        import { describe, it, expect } from 'vitest'
        describe('sanitize', () => {
          it('should call fetchFooStep with retries', () => { expect(1).toBe(1) })
        })
      `,
      errors: [{ data: { name: 'fetchFooStep' }, messageId: 'notReferenced' }],
      name: 'identifier named in it() title not referenced',
    },
    {
      code: `
        import { test, expect } from 'vitest'
        test('fetchFooStep retries on failure', () => { expect(1).toBe(1) })
      `,
      errors: [{ data: { name: 'fetchFooStep' }, messageId: 'notReferenced' }],
      name: 'identifier named in test() title not referenced',
    },
    {
      code: `
        import { describe, it, expect } from 'vitest'
        describe('outer', () => {
          describe('fetchFooStep', () => {
            it('works', () => { expect(1).toBe(1) })
          })
        })
      `,
      errors: [{ data: { name: 'fetchFooStep' }, messageId: 'notReferenced' }],
      name: 'nested describe — inner identifier not referenced',
    },
    {
      code: `
        import { describe, it, expect } from 'vitest'
        describe('fetchFooStep calls fooService', () => {
          it('works', () => { expect(1).toBe(1) })
        })
      `,
      errors: [
        { data: { name: 'fetchFooStep' }, messageId: 'notReferenced' },
        { data: { name: 'fooService' }, messageId: 'notReferenced' },
      ],
      name: 'multiple identifiers in one title — each reported separately',
    },
    {
      code: `
        import { describe, it, expect } from 'vitest'
        describe.only('fetchFooStep', () => {
          it('works', () => { expect(1).toBe(1) })
        })
      `,
      errors: [{ data: { name: 'fetchFooStep' }, messageId: 'notReferenced' }],
      name: 'describe.only — MemberExpression callee still checked',
    },
    {
      code: `
        import { describe, it, expect } from 'vitest'
        describe.each([1, 2])('fetchFooStep case %i', (n) => {
          it('works', () => { expect(1).toBe(1) })
        })
      `,
      errors: [{ data: { name: 'fetchFooStep' }, messageId: 'notReferenced' }],
      name: 'describe.each — CallExpression callee unwrapped',
    },
    {
      code: `
        import { describe, it, expect } from 'vitest'
        describe(\`fetchFooStep\`, () => {
          it('works', () => { expect(1).toBe(1) })
        })
      `,
      errors: [{ data: { name: 'fetchFooStep' }, messageId: 'notReferenced' }],
      name: 'static template-literal title — treated like string title',
    },
  ],
  valid: [
    {
      code: `
        import { describe, it, expect } from 'vitest'
        import { fetchFooStep } from './foo'
        describe('fetchFooStep', () => {
          it('returns something', () => {
            expect(fetchFooStep()).toBeTruthy()
          })
        })
      `,
      name: 'camelCase identifier imported from sibling',
    },
    {
      code: `
        import { describe, it, expect } from 'vitest'
        describe('Schema validation works', () => {
          it('accepts a valid payload', () => { expect(1).toBe(1) })
        })
      `,
      // 'Schema' matches a code suffix but has no internal camelCase
      // transition, so it is a plain prose word — not a flagged identifier.
      // This guards the false-positive guard.
      name: 'suffix word without camelCase transition is not flagged',
    },
    {
      code: `
        import { describe, it, expect } from 'vitest'
        import type { SlackFileRef } from './types'
        describe('SlackFileRef round-trips', () => {
          it('works', () => { expect(1).toBe(1) })
        })
      `,
      name: 'PascalCase identifier imported as type',
    },
    {
      code: `
        import { describe, it, expect } from 'vitest'
        function fetchFooStep() { return 1 }
        describe('fetchFooStep', () => {
          it('returns 1', () => { expect(fetchFooStep()).toBe(1) })
        })
      `,
      name: 'camelCase identifier declared in same file',
    },
    {
      code: `
        import { describe, it, expect } from 'vitest'
        describe('handles the happy path', () => {
          it('returns a value when the input is small', () => {
            expect(1).toBe(1)
          })
        })
      `,
      name: 'prose titles — no identifier-shaped tokens',
    },
    {
      code: `
        import { describe, it, expect } from 'vitest'
        describe('does the thing', () => {
          it('works', () => { expect(1).toBe(1) })
        })
      `,
      name: 'short lowercase words ignored',
    },
    {
      code: `
        import { describe, it, expect } from 'vitest'
        describe('fetchFooStep', () => {
          it('returns a value', async () => {
            const { fetchFooStep } = await import('./foo')
            expect(fetchFooStep()).toBeTruthy()
          })
        })
      `,
      name: 'camelCase identifier referenced via dynamic import',
    },
    {
      code: `
        import { describe, it, expect } from 'vitest'
        describe('shouldIgnoreEvent does a thing', () => {
          it('works', () => { expect(1).toBe(1) })
        })
      `,
      name: 'identifier without listed suffix — intentional false negative',
    },
    {
      code: `
        import { describe, it, expect } from 'vitest'
        import { fetchFooStep } from './foo'
        describe.only('fetchFooStep', () => {
          it.skip('works', () => { expect(fetchFooStep()).toBeTruthy() })
        })
      `,
      name: 'describe.only / it.skip with imported identifier',
    },
    {
      code: `
        import { describe, it, expect } from 'vitest'
        import { fetchFooStep } from './foo'
        describe(\`fetchFooStep\`, () => {
          it('works', () => { expect(fetchFooStep()).toBeTruthy() })
        })
      `,
      name: 'static template-literal title with imported identifier',
    },
    {
      code: `
        import { describe, it, expect } from 'vitest'
        import { fetchFooStep } from './foo'
        describe.each([1, 2])('fetchFooStep case %i', (n) => {
          it('works', () => { expect(fetchFooStep()).toBeTruthy() })
        })
      `,
      name: 'describe.each with imported identifier',
    },
  ],
})
