# @alephic/symmetric-never-exclusions

📝 Enforce symmetric ?: never exclusions in discriminated union types.

💼 This rule is enabled in the ✅ `recommended` config.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

When one member of a discriminated union excludes a property with `?: never`,
every other member that lacks the property must exclude it the same way.
Asymmetric exclusions let excess properties slip through structural typing:
TypeScript only checks excess properties against the members that mention them.

## Examples

❌ Incorrect:

```ts
interface A {
  kind: 'a'
  value: string
  extra?: never
}
interface B {
  kind: 'b'
} // missing `extra?: never`
type Union = A | B
```

✅ Correct:

```ts
interface A {
  kind: 'a'
  value: string
  extra?: never
}
interface B {
  kind: 'b'
  extra?: never
}
type Union = A | B
```

## Limitations

Union members are only checked when they resolve within the same file to an
interface (without an `extends` clause) or a type alias of an object literal.
Members that can't be resolved this way — imported types, interfaces with
heritage (which may inherit the property), mapped or intersection types — are
skipped conservatively rather than risk a false positive.

## When Not To Use It

If your unions are always discriminated by a tag and never constructed from
object literals with excess properties, the exclusions add noise and you can
disable the rule.
