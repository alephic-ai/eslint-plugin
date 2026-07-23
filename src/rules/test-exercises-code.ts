// Flag tests whose describe/it titles name a code identifier the file never
// references. Catches "parallel reimplementation" — where a test's body
// rewrites the function inline instead of calling it, and the assertions
// check the test's own reimplementation. Motivated by envoy run 53476453.

import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils'

import { createRule } from './create-rule'

const TEST_CALLEES = new Set(['describe', 'it', 'test'])

// Only flag identifiers that clearly look like code (vs brand names, column
// names, or prose). Must end in a known suffix AND have an internal camelCase
// transition. Narrow by design — false negatives are fine, false positives
// train developers to suppress the rule and defeat the purpose.
const CODE_SUFFIXES = [
  'Step',
  'Service',
  'Workflow',
  'Handler',
  'Client',
  'Adapter',
  'Repository',
  'Provider',
  'Factory',
  'Resolver',
  'Controller',
  'Middleware',
  'Component',
  'Schema',
  'Ref',
  'Reducer',
]
const SUFFIX_RE = new RegExp(`(${CODE_SUFFIXES.join('|')})$`)
const HAS_CAMEL_TRANSITION = /[a-z][A-Z]/

interface PendingReport {
  identifiers: string[]
  node: TSESTree.Literal | TSESTree.TemplateLiteral
}

function extractIdentifiers(title: string) {
  const tokens = title.split(/[^a-zA-Z0-9]+/).filter(Boolean)
  const seen = new Set<string>()
  const out: string[] = []
  for (const tok of tokens) {
    if (isCodeIdentifier(tok) && !seen.has(tok)) {
      seen.add(tok)
      out.push(tok)
    }
  }
  return out
}

function isCodeIdentifier(token: string) {
  if (!/^[a-zA-Z]/.test(token)) return false
  if (!SUFFIX_RE.test(token)) return false
  if (!HAS_CAMEL_TRANSITION.test(token)) return false
  return true
}

function isTestCallee(callee: TSESTree.Expression) {
  if (
    callee.type === AST_NODE_TYPES.Identifier &&
    TEST_CALLEES.has(callee.name)
  ) {
    return true
  }
  if (
    callee.type === AST_NODE_TYPES.MemberExpression &&
    callee.object.type === AST_NODE_TYPES.Identifier &&
    TEST_CALLEES.has(callee.object.name)
  ) {
    return true
  }
  // Unwrap parameterized callees like `describe.each([...])('title', fn)`
  // and `it.each([...])('title', fn)` where the outer callee is itself a
  // CallExpression. Recursion also handles stacked forms like
  // `describe.each(...).skip('title', fn)`.
  if (callee.type === AST_NODE_TYPES.CallExpression) {
    return isTestCallee(callee.callee)
  }
  return false
}

// Returns { title, node } when the argument is a statically-analyzable title —
// a plain string literal or a template literal with no interpolations. Returns
// null otherwise.
function readTitle(arg: TSESTree.CallExpressionArgument) {
  if (arg.type === AST_NODE_TYPES.Literal && typeof arg.value === 'string') {
    return { node: arg, title: arg.value }
  }
  if (
    arg.type === AST_NODE_TYPES.TemplateLiteral &&
    arg.expressions.length === 0 &&
    arg.quasis.length === 1
  ) {
    const cooked = arg.quasis[0]?.value.cooked
    if (cooked !== null && cooked !== undefined) {
      return { node: arg, title: cooked }
    }
  }
  return null
}

export const rule = createRule({
  create(context) {
    const referencedNames = new Set<string>()
    const pending: PendingReport[] = []

    return {
      'CallExpression'(node) {
        if (!isTestCallee(node.callee)) return
        const firstArg = node.arguments[0]
        if (firstArg === undefined) return
        const titleInfo = readTitle(firstArg)
        if (titleInfo === null) return
        const identifiers = extractIdentifiers(titleInfo.title)
        if (identifiers.length > 0) {
          pending.push({ identifiers, node: titleInfo.node })
        }
      },
      'Identifier'(node) {
        referencedNames.add(node.name)
      },
      'Program:exit'() {
        for (const { identifiers, node } of pending) {
          for (const name of identifiers) {
            if (referencedNames.has(name)) continue
            context.report({
              data: { name },
              messageId: 'notReferenced',
              node,
            })
          }
        }
      },
    }
  },
  defaultOptions: [],
  meta: {
    docs: {
      description:
        'Require test describe/it titles to name identifiers that the file actually references, so tests exercise the real code instead of a parallel reimplementation.',
    },
    messages: {
      notReferenced:
        "Test title names '{{name}}' but the file never references it. Import or call the real symbol, or remove the identifier from the title.",
    },
    schema: [],
    type: 'problem',
  },
  name: 'test-exercises-code',
})
