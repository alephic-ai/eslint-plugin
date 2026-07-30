import { RuleTester } from '@typescript-eslint/rule-tester'
import { afterAll, describe, it } from 'vitest'

import { rule } from './use-step-exports-only.ts'

RuleTester.afterAll = afterAll
RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester()

ruleTester.run('use-step-exports-only', rule, {
  invalid: [
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        export function plainHelper() { return 2 }
      `,
      errors: [{ data: { name: 'plainHelper' }, messageId: 'nonStepExport' }],
      name: 'step file + non-step exported function',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        export const CONFIG = { a: 1 }
      `,
      errors: [{ data: { name: 'CONFIG' }, messageId: 'nonStepExport' }],
      name: 'step file + non-step exported const',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        const KNOWN_NAMES = new Set(['a', 'b'])
      `,
      errors: [{ messageId: 'sideEffect' }],
      name: 'step file + top-level new expression',
    },
    {
      code: `
        function compute() { return 1 }
        export async function fooStep() {
          'use step'
          return 1
        }
        const r = compute()
      `,
      errors: [{ messageId: 'sideEffect' }],
      name: 'step file + top-level call in variable initializer',
    },
    {
      code: `
        function doThing() {}
        export async function fooStep() {
          'use step'
          return 1
        }
        doThing()
      `,
      errors: [{ messageId: 'sideEffect' }],
      name: 'step file + top-level call expression statement',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        import './side-effect'
      `,
      errors: [{ messageId: 'sideEffect' }],
      name: 'step file + side-effect-only import',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        throw new Error('nope')
      `,
      errors: [{ messageId: 'sideEffect' }],
      name: 'step file + top-level throw',
    },
    {
      code: `
        const CONFIG = { a: 1 }
        export async function fooStep() {
          'use step'
          return 1
        }
        export { CONFIG }
      `,
      errors: [{ data: { name: 'CONFIG' }, messageId: 'nonStepExport' }],
      name: 'step file + specifier export of locally-declared non-step const',
    },
    {
      code: `
        function helper() { return 1 }
        export async function fooStep() {
          'use step'
          return 1
        }
        export { helper }
      `,
      errors: [{ data: { name: 'helper' }, messageId: 'nonStepExport' }],
      name: 'step file + specifier export of locally-declared non-step function',
    },
    {
      code: `
        function helper() { return 1 }
        export async function fooStep() {
          'use step'
          return 1
        }
        export { helper as reExported }
      `,
      errors: [{ data: { name: 'reExported' }, messageId: 'nonStepExport' }],
      name: 'step file + renamed specifier export of non-step local',
    },
    {
      code: `
        function compute() { return 1 }
        export async function fooStep() {
          'use step'
          return 1
        }
        export const value = compute()
      `,
      // Only one report — the Program pass flags the export, and the
      // side-effect visitor no longer double-reports the wrapping
      // ExportNamedDeclaration.
      errors: [{ data: { name: 'value' }, messageId: 'nonStepExport' }],
      name: 'step file + exported initializer with side-effect call reports once',
    },
    {
      code: `
        function compute() { return 1 }
        export async function fooStep() {
          'use step'
          return 1
        }
        export default compute()
      `,
      // Only one report — Program pass flags export default; side-effect
      // visitor skips ExportDefaultDeclaration the same way as named exports.
      errors: [{ data: { name: 'this export' }, messageId: 'nonStepExport' }],
      name: 'step file + export default with side-effect call reports once',
    },
    {
      code: `
        function doThing() {}
        export default async function () {
          'use step'
          return 1
        }
        doThing()
      `,
      // A default-exported step makes this a step file even with no named
      // steps — module-level side effects are still banned.
      errors: [{ messageId: 'sideEffect' }],
      name: 'file whose only step is default-exported + top-level call',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        globalThis.cache = {}
      `,
      errors: [{ messageId: 'sideEffect' }],
      name: 'step file + top-level assignment',
    },
    {
      code: `
        let count = 0
        export async function fooStep() {
          'use step'
          return 1
        }
        count++
      `,
      errors: [{ messageId: 'sideEffect' }],
      name: 'step file + top-level update expression',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        export * from './helpers'
      `,
      errors: [{ data: { name: 'this export' }, messageId: 'nonStepExport' }],
      name: 'step file + star re-export of values',
    },
    {
      code: `
        import { SOMETHING } from './constants'

        export async function fooStep() {
          'use step'
          return SOMETHING
        }

        export { SOMETHING }
      `,
      errors: [{ data: { name: 'SOMETHING' }, messageId: 'nonStepExport' }],
      name: 'step file + specifier re-export of imported non-step-named binding',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        export { SOMETHING } from './constants'
      `,
      errors: [{ data: { name: 'SOMETHING' }, messageId: 'nonStepExport' }],
      name: 'step file + specifier source-re-export of non-step-named binding',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        export { fooStep as plainValue } from './steps'
      `,
      errors: [{ data: { name: 'plainValue' }, messageId: 'nonStepExport' }],
      name: 'step file + aliased cross-file re-export to non-Step name is flagged',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        class Foo {
          static items = new Set(['a'])
        }
      `,
      // A static field initializer runs when the class is defined (module
      // load), so it survives step-stubbing and is a side effect.
      errors: [{ messageId: 'sideEffect' }],
      name: 'step file + static class-field initializer with side effect',
    },
    {
      code: `
        enum Color { Red, Green }
        export async function fooStep() {
          'use step'
          return 1
        }
        export { Color }
      `,
      // An enum is a runtime value that survives step-stubbing.
      errors: [{ data: { name: 'Color' }, messageId: 'nonStepExport' }],
      name: 'step file + specifier export of locally-declared enum',
    },
  ],
  valid: [
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
      `,
      name: 'file whose only export is a use-step function',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        export type { GatheredCandidate } from './gather'
      `,
      name: 'step file + type-only re-export',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        export type Y = string
        export interface Z { a: number }
        const N = 3
      `,
      name: 'step file + type aliases + interfaces + pure const',
    },
    {
      code: `
        export function plainHelper() { return 2 }
        export const CONFIG = { a: 1 }
        const S = new Set([1])
      `,
      name: 'no use-step function — rule ignores the file',
    },
    {
      code: `
        function other() { return 1 }
        export async function fooStep() {
          'use step'
          return 1
        }
        function helper() { return other() }
      `,
      name: 'step file + non-exported helper whose body calls another function',
    },
    {
      code: `
        async function barStep() {
          'use step'
          return 2
        }
        export async function fooStep() {
          'use step'
          return 1
        }
        export { barStep }
      `,
      name: 'step file + specifier export of locally-declared step function',
    },
    {
      code: `
        import { closeProgressStep, emitProgressStep } from './steps'

        export async function fooStep() {
          'use step'
          return 1
        }

        export { closeProgressStep, emitProgressStep }
      `,
      name: 'step file + specifier re-export of imported step functions',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }

        export { closeProgressStep } from './steps'
      `,
      name: 'step file + specifier source-re-export of step-named binding',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }

        export { helper as closeProgressStep } from './helpers'
      `,
      name: 'step file + aliased cross-file re-export to Step name is allowed',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        class Foo {
          items = new Set(['a'])
        }
      `,
      name: 'step file + instance class-field initializer (runs at instantiation, not module load)',
    },
    {
      code: `
        export default async function () {
          'use step'
          return 1
        }
      `,
      name: 'file whose only export is an anonymous default-exported step',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        export default async function barStep() {
          'use step'
          return 2
        }
      `,
      name: 'step file + named default-exported step function',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        export type * from './types'
      `,
      name: 'step file + type-only star re-export',
    },
  ],
})
