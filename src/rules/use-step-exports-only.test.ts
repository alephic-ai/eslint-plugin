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
        const KNOWN_NAMES = new Map([['a', 1]])
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
          static items = new Map([['a', 1]])
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
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        function helper() { return 1 }
        helper.maxRetries = 0
      `,
      errors: [{ messageId: 'sideEffect' }],
      name: 'maxRetries on a non-step function',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        import { otherStep } from './other'
        otherStep.maxRetries = 0
      `,
      errors: [{ messageId: 'sideEffect' }],
      name: 'maxRetries on an imported step',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        let fooStepConfig = fooStep
        fooStepConfig.maxRetries = 0
      `,
      errors: [{ messageId: 'sideEffect' }],
      name: 'maxRetries through a let alias',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        var fooStepConfig = fooStep
        fooStepConfig.maxRetries = 0
      `,
      errors: [{ messageId: 'sideEffect' }],
      name: 'maxRetries through a var alias',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        import { otherStep } from './other'
        const otherStepConfig = otherStep as typeof otherStep & { maxRetries?: number }
        otherStepConfig.maxRetries = 0
      `,
      errors: [{ messageId: 'sideEffect' }],
      name: 'maxRetries through an alias of an imported function',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        fooStep.retries = 0
      `,
      errors: [{ messageId: 'sideEffect' }],
      name: 'step property other than maxRetries',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        fooStep.maxRetries = compute()
        function compute() { return 3 }
      `,
      errors: [{ messageId: 'sideEffect' }],
      name: 'maxRetries assigned a call',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        import { MAX } from './config'
        fooStep.maxRetries = MAX
      `,
      errors: [{ messageId: 'sideEffect' }],
      name: 'maxRetries assigned an imported binding',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        let MAX = 3
        fooStep.maxRetries = MAX
      `,
      errors: [{ messageId: 'sideEffect' }],
      name: 'maxRetries assigned a let binding',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        export function barStep(a: string): string
        export function barStep(a: number): number
        export function barStep(a: unknown) { return a }
      `,
      errors: [
        { data: { name: 'barStep' }, line: 8, messageId: 'nonStepExport' },
      ],
      name: 'overloads + non-step implementation reports once, on the implementation',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        const S = new Set([x])
      `,
      errors: [{ messageId: 'sideEffect' }],
      name: 'new Set with identifier element',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        const S = new Set([...['a']])
      `,
      errors: [{ messageId: 'sideEffect' }],
      name: 'new Set with spread element',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        const S = new Set([f()])
      `,
      errors: [{ messageId: 'sideEffect' }],
      name: 'new Set with call element',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        const S = new Set([\`a\`])
      `,
      errors: [{ messageId: 'sideEffect' }],
      name: 'new Set with template literal element',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        const S = new Set([-1])
      `,
      errors: [{ messageId: 'sideEffect' }],
      name: 'new Set with negative number element',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        const S = new Set([null])
      `,
      errors: [{ messageId: 'sideEffect' }],
      name: 'new Set with null element',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        const S = new Set([/a/])
      `,
      errors: [{ messageId: 'sideEffect' }],
      name: 'new Set with regex element',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        const S = new Set([1n])
      `,
      errors: [{ messageId: 'sideEffect' }],
      name: 'new Set with bigint element',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        const S = new Set(['a'], undefined)
      `,
      errors: [{ messageId: 'sideEffect' }],
      name: 'new Set with a second argument',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        const S = new Set(LIST)
        const LIST = ['a']
      `,
      errors: [{ messageId: 'sideEffect' }],
      name: 'new Set with a non-array argument',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        import { Set } from './set'
        const S = new Set(['a'])
      `,
      errors: [{ messageId: 'sideEffect' }],
      name: 'new Set shadowed by an import',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        class Set { constructor(_: unknown) {} }
        const S = new Set(['a'])
      `,
      errors: [{ messageId: 'sideEffect' }],
      name: 'new Set shadowed by a local class',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        export const S = new Set(['a'])
      `,
      errors: [{ data: { name: 'S' }, messageId: 'nonStepExport' }],
      name: 'exported literal Set is still a non-step export',
    },
  ],
  valid: [
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        fooStep.maxRetries = 5
      `,
      name: 'maxRetries on a local step',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        const fooStepConfig: typeof fooStep & { maxRetries?: number } = fooStep
        fooStepConfig.maxRetries = 0
      `,
      name: 'maxRetries through a type-annotated const alias',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        const fooStepConfig = fooStep as typeof fooStep & { maxRetries?: number }
        fooStepConfig.maxRetries = 0
      `,
      name: 'maxRetries through an as-cast const alias',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        const MAX_RETRIES = 20
        fooStep.maxRetries = MAX_RETRIES
      `,
      name: 'maxRetries assigned a top-level number const',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        const early: typeof barStep & { maxRetries?: number } = barStep
        early.maxRetries = 1
        async function barStep() {
          'use step'
        }
      `,
      name: 'maxRetries through an alias declared before its hoisted step',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        export function barStep(a: string): Promise<string>
        export function barStep(a: number): Promise<number>
        export async function barStep(a: unknown) {
          'use step'
          return a
        }
      `,
      name: 'overload signatures + use step implementation',
    },
    {
      code: `
        export default function run(a: string): Promise<string>
        export default function run(a: number): Promise<number>
        export default async function run(a: unknown) {
          'use step'
          return a
        }
      `,
      name: 'default-export overload signatures + use step default implementation',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        export declare function ambient(): void
      `,
      name: 'export declare function',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        const A = new Set(['a', 'b'])
        const B = new Set<number>([1, 2])
        const C = new Set([true])
        const D = new Set([])
        const E = new Set()
      `,
      name: 'literal-only Sets',
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
      name: 'literal-only Set in a static class field',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        const S = new Set(['a'])
      `,
      languageOptions: { globals: { Set: 'readonly' } },
      name: 'literal-only Set with Set declared as a config global',
    },
    {
      code: `
        export async function fooStep() {
          'use step'
          return 1
        }
        const S = new Set(['a'])
      `,
      // No TS lib and ES5 globals: nothing declares `Set`, so the reference
      // resolves to nothing — still the global.
      languageOptions: {
        // @ts-expect-error -- ESLint accepts `ecmaVersion` here; typescript-eslint's `TestLanguageOptions` omits it
        ecmaVersion: 5,
        parserOptions: { lib: [] },
      },
      name: 'literal-only Set with no Set global declared',
    },
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
