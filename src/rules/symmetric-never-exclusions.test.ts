import { RuleTester } from '@typescript-eslint/rule-tester'
import { afterAll, describe, it } from 'vitest'

import { rule } from './symmetric-never-exclusions'

RuleTester.afterAll = afterAll
RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester()

ruleTester.run('symmetric-never-exclusions', rule, {
  invalid: [
    {
      code: `
        interface A { kind: 'a'; value: string; extra?: never }
        interface B { kind: 'b' }
        type Union = A | B
      `,
      errors: [{ messageId: 'missingNeverExclusion' }],
      name: 'asymmetric — B missing extra?: never',
      output: `
        interface A { kind: 'a'; value: string; extra?: never }
        interface B { kind: 'b'; extra?: never }
        type Union = A | B
      `,
    },
    {
      code: `
        interface A { kind: 'a' }
        interface B { kind: 'b'; extra?: never }
        type Union = A | B
      `,
      errors: [{ messageId: 'missingNeverExclusion' }],
      name: 'asymmetric — A missing extra?: never',
      output: `
        interface A { kind: 'a'; extra?: never }
        interface B { kind: 'b'; extra?: never }
        type Union = A | B
      `,
    },
    {
      code: `
        interface A { kind: 'a'; value: string; count?: never; flag?: never }
        interface B { kind: 'b'; count: number; value?: never; flag?: never }
        interface C { kind: 'c'; flag: boolean }
        type Union = A | B | C
      `,
      errors: [
        { messageId: 'missingNeverExclusion' },
        { messageId: 'missingNeverExclusion' },
      ],
      name: '3-member union — C missing value?: never and count?: never',
      // Two fix passes: the overlapping insertions can't apply in one pass,
      // so the rule-tester re-lints until the output is stable.
      output: [
        `
        interface A { kind: 'a'; value: string; count?: never; flag?: never }
        interface B { kind: 'b'; count: number; value?: never; flag?: never }
        interface C { kind: 'c'; flag: boolean; count?: never }
        type Union = A | B | C
      `,
        `
        interface A { kind: 'a'; value: string; count?: never; flag?: never }
        interface B { kind: 'b'; count: number; value?: never; flag?: never }
        interface C { kind: 'c'; flag: boolean; count?: never; value?: never }
        type Union = A | B | C
      `,
      ],
    },
    {
      code: `
        export interface A { kind: 'a'; extra?: never }
        export interface B { kind: 'b' }
        export type Union = A | B
      `,
      errors: [{ messageId: 'missingNeverExclusion' }],
      name: 'exported interfaces — asymmetric',
      output: `
        export interface A { kind: 'a'; extra?: never }
        export interface B { kind: 'b'; extra?: never }
        export type Union = A | B
      `,
    },
    {
      code: `
        type Union = { kind: 'a'; extra?: never } | { kind: 'b' }
      `,
      errors: [{ messageId: 'missingNeverExclusion' }],
      name: 'inline object types — asymmetric',
      output: `
        type Union = { kind: 'a'; extra?: never } | { kind: 'b'; extra?: never }
      `,
    },
    {
      code: `
        interface A { kind: 'a'; extra?: never }
        interface B { kind: 'b', }
        type Union = A | B
      `,
      errors: [{ messageId: 'missingNeverExclusion' }],
      // Trailing comma is already a member separator — the fix must not add a
      // second one (`,;`).
      name: 'asymmetric — member with trailing comma separator',
      output: `
        interface A { kind: 'a'; extra?: never }
        interface B { kind: 'b', extra?: never }
        type Union = A | B
      `,
    },
    {
      code: `
        interface A { kind: 'a'; extra?: never }
        interface B {}
        type Union = A | B
      `,
      errors: [{ messageId: 'missingNeverExclusion' }],
      // Empty body — the token before `}` is `{`, so the fix must not emit a
      // leading `;`.
      name: 'asymmetric — empty interface body',
      output: `
        interface A { kind: 'a'; extra?: never }
        interface B { extra?: never}
        type Union = A | B
      `,
    },
    {
      code: `
        interface A {
          kind: 'a'
          extra?: never
        }
        interface B {
          kind: 'b'
        }
        type Union = A | B
      `,
      errors: [{ messageId: 'missingNeverExclusion' }],
      name: 'asymmetric — multi-line interface body',
      output: `
        interface A {
          kind: 'a'
          extra?: never
        }
        interface B {
          kind: 'b'
          extra?: never
        }
        type Union = A | B
      `,
    },
  ],
  valid: [
    {
      code: `
        interface A { kind: 'a'; value: string }
        interface B { kind: 'b'; count: number }
        type Union = A | B
      `,
      name: 'union without any ?: never',
    },
    {
      code: `
        interface A { kind: 'a'; value: string; count?: never }
        interface B { kind: 'b'; count: number; value?: never }
        type Union = A | B
      `,
      name: 'symmetric ?: never',
    },
    {
      code: `
        interface A { kind: 'a'; value: string; count?: never; flag?: never }
        interface B { kind: 'b'; count: number; value?: never; flag?: never }
        interface C { kind: 'c'; flag: boolean; value?: never; count?: never }
        type Union = A | B | C
      `,
      name: '3-member symmetric union',
    },
    {
      code: `
        interface A { shared: string; extra?: never }
        interface B { shared: string; extra: number }
        type Union = A | B
      `,
      name: 'member has the property as a real type',
    },
    {
      code: `
        type Single = { kind: 'a'; value: string }
      `,
      name: 'non-union type alias',
    },
    {
      code: `
        type Primitive = string | number | boolean
      `,
      name: 'union of non-object types',
    },
    {
      code: `
        export interface A { kind: 'a'; value: string; count?: never }
        export interface B { kind: 'b'; count: number; value?: never }
        export type Union = A | B
      `,
      name: 'exported interfaces with symmetric exclusions',
    },
    {
      code: `
        interface Base { extra: string }
        interface A { kind: 'a'; extra?: never }
        interface B extends Base { kind: 'b' }
        type Union = A | B
      `,
      // B inherits `extra` from Base; heritage isn't resolved, so the rule
      // must skip B rather than autofix `extra?: never` into a compile error.
      name: 'member with extends clause is skipped',
    },
    {
      code: `
        import type { B } from './b'
        interface A { kind: 'a'; extra?: never }
        type Union = A | B
      `,
      // Imported members can't be resolved in this file — the rule skips them
      // (and with only one resolvable member, checks nothing).
      name: 'union member imported from another file is skipped',
    },
  ],
})
