import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils'

import { createRule } from './create-rule.ts'

export const rule = createRule({
  create(context) {
    const ast = context.sourceCode.ast

    return {
      TSTypeAliasDeclaration(node) {
        const { typeAnnotation } = node
        if (typeAnnotation.type !== AST_NODE_TYPES.TSUnionType) return

        const members = typeAnnotation.types
          .map((member) => getMemberInfo(member))
          .filter((m) => m !== null)

        if (members.length < 2) return

        const allNeverProps = new Set<string>()
        for (const member of members) {
          for (const prop of member.neverProps) {
            allNeverProps.add(prop)
          }
        }

        if (allNeverProps.size === 0) return

        for (const propName of allNeverProps) {
          for (const member of members) {
            if (member.realProps.has(propName)) continue
            if (member.neverProps.has(propName)) continue
            context.report({
              data: {
                memberName: member.name,
                propertyName: propName,
              },
              fix(fixer) {
                const { body } = member
                const lastToken = context.sourceCode.getLastToken(body)
                if (!lastToken) return null
                // Token before the closing `}` — the last member, its trailing
                // separator, or `{` for an empty body. Both branches insert
                // after it so the closing brace keeps its own indentation.
                const tokenBefore = context.sourceCode.getTokenBefore(lastToken)
                if (!tokenBefore) return null
                const isSingleLine = body.loc.start.line === body.loc.end.line
                if (isSingleLine) {
                  // `{` (empty body), `,` (trailing comma), and `;` are all
                  // valid separators already — inserting another would emit
                  // `,;` or a leading `;`. Only add a `;` after a real member.
                  const hasSeparator =
                    tokenBefore.value === '{' ||
                    tokenBefore.value === ',' ||
                    tokenBefore.value === ';'
                  const suffix = hasSeparator
                    ? ` ${propName}?: never`
                    : `; ${propName}?: never`
                  return fixer.insertTextAfter(tokenBefore, suffix)
                }
                // Multi-line body: put the exclusion on its own line after the
                // last member (or its separator), indented to match members. A
                // newline separates interface members, so no `;`/`,` is needed.
                const members =
                  body.type === AST_NODE_TYPES.TSInterfaceBody
                    ? body.body
                    : body.members
                const firstMember = members[0]
                const firstMemberToken = firstMember
                  ? context.sourceCode.getFirstToken(firstMember)
                  : null
                const memberIndent = firstMemberToken
                  ? ' '.repeat(firstMemberToken.loc.start.column)
                  : '  '
                return fixer.insertTextAfter(
                  tokenBefore,
                  `\n${memberIndent}${propName}?: never`,
                )
              },
              messageId: 'missingNeverExclusion',
              node: member.node,
            })
          }
        }
      },
    }

    function getMemberInfo(member: TSESTree.TypeNode) {
      let body: TSESTree.TSInterfaceBody | TSESTree.TSTypeLiteral
      let name: string

      if (member.type === AST_NODE_TYPES.TSTypeLiteral) {
        body = member
        name = '{...}'
      } else if (
        member.type === AST_NODE_TYPES.TSTypeReference &&
        member.typeName.type === AST_NODE_TYPES.Identifier
      ) {
        name = member.typeName.name
        const resolved = resolveDeclarationBody(name)
        if (!resolved) return null
        body = resolved
      } else {
        return null
      }

      const properties =
        body.type === AST_NODE_TYPES.TSInterfaceBody ? body.body : body.members
      const neverProps = new Set<string>()
      const realProps = new Set<string>()

      for (const prop of properties) {
        // Method signatures (including get/set accessors) and string-literal
        // keys declare the property just as much as `x: T` does — missing
        // them here would autofix a conflicting `x?: never` next to them.
        if (
          prop.type !== AST_NODE_TYPES.TSPropertySignature &&
          prop.type !== AST_NODE_TYPES.TSMethodSignature
        ) {
          continue
        }
        const { key } = prop
        const propName =
          key.type === AST_NODE_TYPES.Identifier
            ? key.name
            : key.type === AST_NODE_TYPES.Literal &&
                typeof key.value === 'string'
              ? key.value
              : null
        if (propName === null) continue

        if (
          prop.type === AST_NODE_TYPES.TSPropertySignature &&
          prop.optional &&
          prop.typeAnnotation?.typeAnnotation.type ===
            AST_NODE_TYPES.TSNeverKeyword
        ) {
          neverProps.add(propName)
        } else {
          realProps.add(propName)
        }
      }

      return { body, name, neverProps, node: member, realProps }
    }

    function resolveDeclarationBody(name: string) {
      for (const stmt of ast.body) {
        const decl =
          stmt.type === AST_NODE_TYPES.ExportNamedDeclaration &&
          stmt.declaration !== null
            ? stmt.declaration
            : stmt
        if (
          decl.type === AST_NODE_TYPES.TSInterfaceDeclaration &&
          decl.id.name === name
        ) {
          // An interface with an `extends` clause may inherit the property
          // being checked, and heritage isn't resolved here — skip it like an
          // unresolvable reference rather than report (and autofix) a false
          // positive that would break compilation.
          if (decl.extends.length > 0) return null
          return decl.body
        }
        if (
          decl.type === AST_NODE_TYPES.TSTypeAliasDeclaration &&
          decl.id.name === name &&
          decl.typeAnnotation.type === AST_NODE_TYPES.TSTypeLiteral
        ) {
          return decl.typeAnnotation
        }
      }
      return null
    }
  },
  defaultOptions: [],
  meta: {
    docs: {
      description:
        'Enforce symmetric ?: never exclusions in discriminated union types',
    },
    fixable: 'code',
    messages: {
      missingNeverExclusion:
        'Union member "{{memberName}}" is missing "{{propertyName}}?: never" — property is excluded with ?: never in another union member but not here.',
    },
    schema: [],
    type: 'problem',
  },
  name: 'symmetric-never-exclusions',
})
