import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils'

import { createRule } from './create-rule.ts'

export type Options = Partial<Record<Kind, Wrappers>>

// The wrappers a kind of entry point accepts. A page or layout wrapped with a
// `skip` wrapper needs no session, so its generateMetadata isn't checked.
export interface Wrappers {
  require?: string[]
  skip?: string[]
}

type Kind =
  'action' | 'layout' | 'layoutMetadata' | 'page' | 'pageMetadata' | 'route'

const defaults: Record<Kind, Wrappers> = {
  action: { require: ['requireActionAuth'], skip: ['skipActionAuth'] },
  layout: { require: ['requireLayoutAuth'], skip: ['skipLayoutAuth'] },
  layoutMetadata: { require: ['requireLayoutMetadataAuth'] },
  page: { require: ['requirePageAuth'], skip: ['skipPageAuth'] },
  pageMetadata: { require: ['requirePageMetadataAuth'] },
  route: { require: ['requireRouteAuth'], skip: ['skipRouteAuth'] },
}

interface Export {
  name: string
  node: TSESTree.Node
  value: null | TSESTree.Node | undefined
}

const nameList = {
  items: { type: 'string' },
  minItems: 1,
  type: 'array',
} as const
const wrappersSchema = {
  additionalProperties: false,
  properties: { require: nameList, skip: nameList },
  type: 'object',
} as const

export const rule = createRule<
  [Options],
  'inlineAction' | 'unnamedExport' | 'unwrapped'
>({
  create(context) {
    const configured = { ...defaults, ...context.options.at(0) }
    // Next.js entry files under an app directory, with their kind
    const kind =
      /(?:^|\/)app\/(?:.+\/)?(default|layout|page|route|template)\.[jt]sx?$/.exec(
        context.filename.replaceAll('\\', '/'),
      )?.[1]
    // Local names of imports, mapped to their exported names, so a local
    // function named like a wrapper doesn't count
    const imported = new Map<string, string>()

    function accepted(of: Kind) {
      const { require = [], skip = [] } = configured[of]
      return [...require, ...skip]
    }

    function wrapperOf(value: null | TSESTree.Node | undefined) {
      return value?.type === AST_NODE_TYPES.CallExpression &&
        value.callee.type === AST_NODE_TYPES.Identifier
        ? imported.get(value.callee.name)
        : undefined
    }

    function check({ name, node, value }: Export, allowed: string[]) {
      const wrapper = wrapperOf(value)
      if (wrapper !== undefined && allowed.includes(wrapper)) return
      context.report({
        data: { name, wrappers: list(allowed) },
        messageId: name === '*' ? 'unnamedExport' : 'unwrapped',
        node,
      })
    }

    return {
      'ArrowFunctionExpression, FunctionDeclaration, FunctionExpression'(
        node:
          | TSESTree.ArrowFunctionExpression
          | TSESTree.FunctionDeclaration
          | TSESTree.FunctionExpression,
      ) {
        if (
          node.body?.type === AST_NODE_TYPES.BlockStatement &&
          directives(node.body.body).includes('use server')
        ) {
          context.report({
            data: { wrappers: list(accepted('action')) },
            messageId: 'inlineAction',
            node,
          })
        }
      },
      'Program'(program) {
        for (const statement of program.body) {
          if (statement.type !== AST_NODE_TYPES.ImportDeclaration) continue
          for (const specifier of statement.specifiers) {
            if (specifier.type === AST_NODE_TYPES.ImportSpecifier) {
              const { imported: name } = specifier
              imported.set(
                specifier.local.name,
                name.type === AST_NODE_TYPES.Identifier
                  ? name.name
                  : name.value,
              )
            }
          }
        }

        const found = program.body.flatMap(exportsOf)
        if (directives(program.body).includes('use server')) {
          for (const entry of found) check(entry, accepted('action'))
          return
        }
        if (kind === undefined) return

        if (kind === 'route') {
          const methods = [
            'DELETE',
            'GET',
            'HEAD',
            'OPTIONS',
            'PATCH',
            'POST',
            'PUT',
          ]
          for (const entry of found) {
            if (entry.name === '*' || methods.includes(entry.name)) {
              check(entry, accepted('route'))
            }
          }
          return
        }

        const isPage = kind === 'page' || kind === 'default'
        const component = isPage ? 'page' : 'layout'
        const { require = [], skip = [] } = configured[component]
        const defaultExport = found.find(({ name }) => name === 'default')
        if (defaultExport) check(defaultExport, [...require, ...skip])
        const wrapper = wrapperOf(defaultExport?.value)
        if (wrapper !== undefined && skip.includes(wrapper)) return
        for (const entry of found) {
          if (entry.name === '*' || entry.name === 'generateMetadata') {
            check(entry, accepted(isPage ? 'pageMetadata' : 'layoutMetadata'))
          }
        }
      },
    }
  },
  // eslint-disable-next-line eslint-plugin/require-meta-default-options -- ESLint deep-merges them, keeping a default `skip` that a consumer's kind replaces, so `create` merges `defaults`
  meta: {
    docs: {
      description:
        'Require Next.js pages, layouts, route handlers and server actions to be exported as a direct call to an auth wrapper',
    },
    messages: {
      inlineAction:
        "Inline server actions can't be wrapped. Export the action from a 'use server' file, wrapped with {{wrappers}}.",
      unnamedExport:
        "`export *` and destructured exports hide which names they export, so this rule can't check that they're wrapped. Rewrite this as one `export const <name> = <wrapper>(...)` per entry point it exports, where <wrapper> is {{wrappers}}.",
      unwrapped:
        '`{{name}}` is a server entry point, so export it as a direct call to {{wrappers}}.',
    },
    schema: [
      {
        additionalProperties: false,
        description:
          'The wrappers each kind of entry point accepts, split into those that require auth and those that skip it',
        properties: {
          action: wrappersSchema,
          layout: wrappersSchema,
          layoutMetadata: wrappersSchema,
          page: wrappersSchema,
          pageMetadata: wrappersSchema,
          route: wrappersSchema,
        },
        type: 'object',
      },
    ],
    type: 'problem',
  },
  name: 'require-auth-wrapper',
})

// The leading directives of a program or function body
function directives(statements: TSESTree.Node[]) {
  const found: string[] = []
  for (const statement of statements) {
    if (
      statement.type !== AST_NODE_TYPES.ExpressionStatement ||
      typeof statement.directive !== 'string'
    ) {
      break
    }
    found.push(statement.directive)
  }
  return found
}

// The names and values a statement exports; `*` stands for any it can't name
function exportsOf(statement: TSESTree.ProgramStatement): Export[] {
  if (statement.type === AST_NODE_TYPES.ExportAllDeclaration) {
    return statement.exportKind === 'type'
      ? []
      : [{ name: '*', node: statement, value: undefined }]
  }
  if (statement.type === AST_NODE_TYPES.ExportDefaultDeclaration) {
    return [{ name: 'default', node: statement, value: statement.declaration }]
  }
  if (
    statement.type !== AST_NODE_TYPES.ExportNamedDeclaration ||
    statement.exportKind === 'type'
  ) {
    return []
  }
  const { declaration } = statement
  if (declaration?.type === AST_NODE_TYPES.VariableDeclaration) {
    return declaration.declarations.map((declarator) => ({
      name:
        declarator.id.type === AST_NODE_TYPES.Identifier
          ? declarator.id.name
          : '*',
      node: declarator,
      value: declarator.init,
    }))
  }
  if (
    declaration?.type === AST_NODE_TYPES.ClassDeclaration ||
    declaration?.type === AST_NODE_TYPES.FunctionDeclaration
  ) {
    return [
      {
        name: declaration.id?.name ?? '*',
        node: declaration,
        value: undefined,
      },
    ]
  }
  // Types, interfaces and ambient declarations export nothing at runtime
  if (declaration) return []
  return statement.specifiers
    .filter((specifier) => specifier.exportKind !== 'type')
    .map((specifier) => ({
      name:
        specifier.exported.type === AST_NODE_TYPES.Identifier
          ? specifier.exported.name
          : specifier.exported.value,
      node: specifier,
      value: undefined,
    }))
}

function list(names: string[]) {
  return names.map((name) => `${name}()`).join(' or ')
}
