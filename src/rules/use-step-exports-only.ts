// In any file that contains a `'use step'` function, only step functions and
// type-only exports are allowed, and module-level statements must be pure
// (function/class declarations and pure literal initializers). Non-step
// exports and side-effectful top-level statements survive the Workflow
// DevKit's step-stubbing and drag the file's whole import chain (e.g.
// `db` → `pg`) into the workflow VM bundle — the failure mode behind
// alephic-intelligence-v2's Jul 5 outage (PR #1031). The fix pattern is to
// move non-step logic into a sibling module.

import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils'

import { createRule } from './create-rule'

// Walk `program.body` once and classify every top-level identifier binding.
// Imports go into `importedNames`; local declarations split into step
// functions (`stepNames`) vs everything else (`nonStepValueNames`). Used by
// the specifier-export check to decide whether `export { name }` re-exports
// a known step or a known non-step value. `hasDefaultExportedStep` covers
// `export default` step functions, which may be anonymous and so can't be
// represented in `stepNames`.
function collectLocalBindings(program: TSESTree.Program) {
  const importedNames = new Set<string>()
  const nonStepValueNames = new Set<string>()
  const stepNames = new Set<string>()
  let hasDefaultExportedStep = false

  const classifyFunction = (decl: TSESTree.FunctionDeclaration) => {
    if (decl.id === null) return
    if (hasUseStepDirective(decl)) {
      stepNames.add(decl.id.name)
    } else {
      nonStepValueNames.add(decl.id.name)
    }
  }

  const classifyVariable = (decl: TSESTree.VariableDeclaration) => {
    for (const declarator of decl.declarations) {
      if (declarator.id.type !== AST_NODE_TYPES.Identifier) continue
      if (isStepFunctionInit(declarator.init)) {
        stepNames.add(declarator.id.name)
      } else {
        nonStepValueNames.add(declarator.id.name)
      }
    }
  }

  const classifyClass = (decl: TSESTree.ClassDeclaration) => {
    if (decl.id === null) return
    nonStepValueNames.add(decl.id.name)
  }

  const classifyEnum = (decl: TSESTree.TSEnumDeclaration) => {
    // `const enum` is erased at compile time and `declare enum` is ambient —
    // neither survives step-stubbing, so only a real enum is a runtime value.
    if (decl.const || decl.declare) return
    nonStepValueNames.add(decl.id.name)
  }

  const classifyModule = (decl: TSESTree.TSModuleDeclaration) => {
    // `declare namespace` is ambient (type-only). A value namespace uses an
    // Identifier id (`namespace X`); the string-module form is not exportable.
    if (decl.declare) return
    if (decl.id.type !== AST_NODE_TYPES.Identifier) return
    nonStepValueNames.add(decl.id.name)
  }

  for (const stmt of program.body) {
    if (stmt.type === AST_NODE_TYPES.ImportDeclaration) {
      for (const specifier of stmt.specifiers) {
        importedNames.add(specifier.local.name)
      }
      continue
    }
    if (stmt.type === AST_NODE_TYPES.FunctionDeclaration) {
      classifyFunction(stmt)
      continue
    }
    if (stmt.type === AST_NODE_TYPES.VariableDeclaration) {
      classifyVariable(stmt)
      continue
    }
    if (stmt.type === AST_NODE_TYPES.ClassDeclaration) {
      classifyClass(stmt)
      continue
    }
    if (stmt.type === AST_NODE_TYPES.TSEnumDeclaration) {
      classifyEnum(stmt)
      continue
    }
    if (stmt.type === AST_NODE_TYPES.TSModuleDeclaration) {
      classifyModule(stmt)
      continue
    }
    if (stmt.type === AST_NODE_TYPES.ExportDefaultDeclaration) {
      if (isStepFunctionInit(stmt.declaration)) {
        hasDefaultExportedStep = true
        if (
          stmt.declaration.type === AST_NODE_TYPES.FunctionDeclaration &&
          stmt.declaration.id !== null
        ) {
          stepNames.add(stmt.declaration.id.name)
        }
      }
      continue
    }
    if (stmt.type === AST_NODE_TYPES.ExportNamedDeclaration) {
      const inner = stmt.declaration
      if (inner === null) continue
      if (inner.type === AST_NODE_TYPES.FunctionDeclaration) {
        classifyFunction(inner)
        continue
      }
      if (inner.type === AST_NODE_TYPES.VariableDeclaration) {
        classifyVariable(inner)
        continue
      }
      if (inner.type === AST_NODE_TYPES.ClassDeclaration) {
        classifyClass(inner)
        continue
      }
      if (inner.type === AST_NODE_TYPES.TSEnumDeclaration) {
        classifyEnum(inner)
        continue
      }
      if (inner.type === AST_NODE_TYPES.TSModuleDeclaration) {
        classifyModule(inner)
        continue
      }
    }
  }

  return { hasDefaultExportedStep, importedNames, nonStepValueNames, stepNames }
}

// Walk up from `node` through parents. Return the direct child of Program
// if reached, or `null` if a function/arrow ancestor is hit first (its body
// is lazy — tree-shakes / doesn't run at module load).
function findTopLevelStatement(node: TSESTree.Node) {
  let cur: TSESTree.Node | undefined = node.parent
  while (cur !== undefined) {
    if (
      cur.type === AST_NODE_TYPES.ArrowFunctionExpression ||
      cur.type === AST_NODE_TYPES.FunctionDeclaration ||
      cur.type === AST_NODE_TYPES.FunctionExpression
    ) {
      return null
    }
    // Instance class-field initializers run at instantiation (`new Foo()`),
    // not at module load, so a side effect inside one is lazy. Static fields
    // run when the class is defined, so keep walking up to flag those.
    if (cur.type === AST_NODE_TYPES.PropertyDefinition && !cur.static) {
      return null
    }
    if (cur.parent?.type === AST_NODE_TYPES.Program) {
      return cur
    }
    cur = cur.parent
  }
  return null
}

function findVariableDeclaratorAncestor(node: TSESTree.Node) {
  let cur: TSESTree.Node | undefined = node.parent
  while (cur !== undefined) {
    if (cur.type === AST_NODE_TYPES.VariableDeclarator) return cur
    cur = cur.parent
  }
  return null
}

// True when a function body starts with a `'use step'` string-literal
// directive. Directives are `ExpressionStatement`s whose `expression` is a
// string `Literal` — the same shape as `'use client'` / `'use strict'`.
function hasUseStepDirective(
  fn:
    | TSESTree.ArrowFunctionExpression
    | TSESTree.FunctionDeclaration
    | TSESTree.FunctionExpression,
) {
  if (fn.body.type !== AST_NODE_TYPES.BlockStatement) return false
  const first = fn.body.body[0]
  if (first === undefined) return false
  if (first.type !== AST_NODE_TYPES.ExpressionStatement) return false
  const expr = first.expression
  return (
    expr.type === AST_NODE_TYPES.Literal &&
    typeof expr.value === 'string' &&
    expr.value === 'use step'
  )
}

function isStepFunctionInit(node: null | TSESTree.Node | undefined) {
  if (node === null || node === undefined) return false
  if (
    node.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
    node.type !== AST_NODE_TYPES.FunctionDeclaration &&
    node.type !== AST_NODE_TYPES.FunctionExpression
  ) {
    return false
  }
  return hasUseStepDirective(node)
}

export const rule = createRule({
  create(context) {
    let hasStep = false
    const reportedTopLevel = new Set<TSESTree.Node>()

    return {
      ':matches(AwaitExpression, AssignmentExpression, CallExpression, NewExpression, TaggedTemplateExpression, UpdateExpression)'(
        node: TSESTree.Node,
      ) {
        if (!hasStep) return
        const topLevel = findTopLevelStatement(node)
        if (topLevel === null) return

        // `export const x = compute()` / `export default compute()` — the
        // Program pass already reports these as `nonStepExport`, so skip
        // here to avoid double-reporting the same line.
        if (
          topLevel.type === AST_NODE_TYPES.ExportNamedDeclaration ||
          topLevel.type === AST_NODE_TYPES.ExportDefaultDeclaration
        ) {
          return
        }

        if (topLevel.type === AST_NODE_TYPES.ExpressionStatement) {
          if (reportedTopLevel.has(topLevel)) return
          reportedTopLevel.add(topLevel)
          context.report({ messageId: 'sideEffect', node: topLevel })
          return
        }

        if (topLevel.type === AST_NODE_TYPES.VariableDeclaration) {
          const declarator = findVariableDeclaratorAncestor(node)
          if (declarator === null) return
          if (reportedTopLevel.has(declarator)) return
          reportedTopLevel.add(declarator)
          context.report({ messageId: 'sideEffect', node: declarator })
          return
        }

        // Any other top-level statement (ThrowStatement, IfStatement,
        // ForStatement, WhileStatement, etc.) that contains a side-effect
        // is a module-level statement that survives step-stubbing — flag it.
        if (reportedTopLevel.has(topLevel)) return
        reportedTopLevel.add(topLevel)
        context.report({ messageId: 'sideEffect', node: topLevel })
      },

      'ImportDeclaration'(node: TSESTree.ImportDeclaration) {
        if (!hasStep) return
        // Side-effect-only imports (no specifiers) execute at module load
        // and drag their chain into the workflow VM bundle.
        if (node.specifiers.length === 0) {
          context.report({ messageId: 'sideEffect', node })
        }
      },
      'Program'(program) {
        const bindings = collectLocalBindings(program)
        hasStep = bindings.stepNames.size > 0 || bindings.hasDefaultExportedStep
        if (!hasStep) return

        for (const stmt of program.body) {
          if (stmt.type === AST_NODE_TYPES.ExportNamedDeclaration) {
            if (stmt.exportKind === 'type') continue
            if (stmt.declaration === null) {
              // Specifier exports: `export { a, b }` or
              // `export { a } from './x'`. Classify each specifier's local
              // name against the collected bindings and report non-step
              // value re-exports.
              for (const specifier of stmt.specifiers) {
                if (specifier.exportKind === 'type') continue
                if (specifier.local.type !== AST_NODE_TYPES.Identifier) continue
                const localName = specifier.local.name
                const exportedName =
                  specifier.exported.type === AST_NODE_TYPES.Identifier
                    ? specifier.exported.name
                    : localName

                // Cross-file re-exports can't be classified via local
                // bindings — for `export { X } from './y'`, `localName` is a
                // remote binding (may collide with a same-named local step).
                // For `import { X }; export { X }`, the name is an import.
                // Fall back to the `*Step` naming convention on the
                // *exported* binding: step functions consistently use this
                // suffix. Keying on the exported side keeps aliased
                // re-exports honest — `export { foo as barStep }` is a step,
                // `export { fooStep as bar }` is not. Anything else is a
                // non-step value re-export that survives step-stubbing and
                // drags the referenced module into the workflow VM bundle.
                const isSourceReExport = stmt.source !== null
                const isImportedReExport =
                  !isSourceReExport && bindings.importedNames.has(localName)
                if (isSourceReExport || isImportedReExport) {
                  if (exportedName.endsWith('Step')) continue
                  context.report({
                    data: { name: exportedName },
                    messageId: 'nonStepExport',
                    node: specifier,
                  })
                  continue
                }

                // Local specifier: `export { name }` / `export { name as y }`.
                // Resolve against this file's collected bindings.
                if (bindings.stepNames.has(localName)) continue
                if (!bindings.nonStepValueNames.has(localName)) continue
                context.report({
                  data: { name: exportedName },
                  messageId: 'nonStepExport',
                  node: specifier,
                })
              }
              continue
            }
            const inner = stmt.declaration
            if (
              inner.type === AST_NODE_TYPES.TSTypeAliasDeclaration ||
              inner.type === AST_NODE_TYPES.TSInterfaceDeclaration
            ) {
              continue
            }
            if (inner.type === AST_NODE_TYPES.FunctionDeclaration) {
              if (hasUseStepDirective(inner)) continue
              context.report({
                data: { name: inner.id?.name ?? 'this export' },
                messageId: 'nonStepExport',
                node: inner,
              })
              continue
            }
            if (inner.type === AST_NODE_TYPES.VariableDeclaration) {
              for (const declarator of inner.declarations) {
                if (isStepFunctionInit(declarator.init)) continue
                const name =
                  declarator.id.type === AST_NODE_TYPES.Identifier
                    ? declarator.id.name
                    : 'this export'
                context.report({
                  data: { name },
                  messageId: 'nonStepExport',
                  node: declarator,
                })
              }
              continue
            }
            // ClassDeclaration, TSEnumDeclaration, or anything else exported
            // as a value declaration.
            const named =
              'id' in inner && inner.id?.type === AST_NODE_TYPES.Identifier
                ? inner.id.name
                : 'this export'
            context.report({
              data: { name: named },
              messageId: 'nonStepExport',
              node: inner,
            })
            continue
          }

          if (stmt.type === AST_NODE_TYPES.ExportDefaultDeclaration) {
            if (isStepFunctionInit(stmt.declaration)) continue
            context.report({
              data: { name: 'this export' },
              messageId: 'nonStepExport',
              node: stmt,
            })
            continue
          }

          if (stmt.type === AST_NODE_TYPES.ExportAllDeclaration) {
            if (stmt.exportKind === 'type') continue
            context.report({
              data: { name: 'this export' },
              messageId: 'nonStepExport',
              node: stmt,
            })
            continue
          }
        }
      },
    }
  },
  defaultOptions: [],
  meta: {
    docs: {
      description:
        "In files that contain a 'use step' function, only step functions and type-only exports are allowed, and module-level statements must be pure. Non-step exports and side-effectful top-level statements survive the Workflow DevKit's step-stubbing and drag the file's import chain into the workflow VM bundle.",
    },
    messages: {
      nonStepExport:
        "Files with a 'use step' function may only export steps or types. '{{name}}' is a non-step value export; move it to a sibling module.",
      sideEffect:
        "Files with a 'use step' function may not have side-effectful module-level statements — they survive the Workflow DevKit's step-stubbing and drag the whole import chain into the workflow VM bundle. Move this to a sibling module.",
    },
    schema: [],
    type: 'problem',
  },
  name: 'use-step-exports-only',
})
