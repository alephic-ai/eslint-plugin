# @alephic/require-auth-wrapper

📝 Require Next.js pages, layouts, route handlers and server actions to be exported as a direct call to an auth wrapper.

🚫 This rule is _disabled_ in the ✅ `recommended` config.

<!-- end auto-generated rule header -->

Next.js middleware can't be the only auth check: server actions can be called
directly, and a matcher that misses a route leaves it open. This rule makes
every server entry point decide for itself by requiring it to be exported as a
**direct call** to an auth wrapper:

- In any `app` directory, the default export of `page`, `layout`, `template`, and
  `default` files, and their `generateMetadata`
- Each HTTP method a `route` file exports
- Each export of a `'use server'` file

It also reports inline `'use server'` functions, which can't be wrapped, and
`export *` or destructured exports in those files, which hide the names they
export.

A wrapper only counts when it's imported, from any module, so a local function
with the same name doesn't. Use `files` and `ignores` to choose where the rule
runs. It doesn't check workflow steps or other
files Next.js serves, such as `sitemap.ts` and `opengraph-image.tsx`.

The defaults match Alephic's create-app template. Configure the options to
match your own wrappers.

## Examples

❌ Incorrect:

```tsx
// src/app/notes/page.tsx
export default async function Page() {
  return <Notes />
}

// src/notes/note-actions.ts
'use server'
export async function saveNote(text: string) {}
```

✅ Correct:

```tsx
// src/app/notes/page.tsx
import { requirePageAuth } from '@/auth/require-auth'

export default requirePageAuth(async (session) => <Notes user={session.user} />)

// src/notes/note-actions.ts
'use server'
import { requireActionAuth } from '@/auth/require-auth'

export const saveNote = requireActionAuth(async (session, text: string) => {})
```

## Options

The option maps each kind of entry point to the wrappers it accepts, split into
`require`, which pass a session, and `skip`, for entry points anyone can reach.
A page or layout wrapped with a `skip` wrapper needs no session, so its
`generateMetadata` isn't checked.

A kind you pass replaces its default, `skip` included. The others keep theirs.
The defaults are:

```js
{
  action: { require: ['requireActionAuth'], skip: ['skipActionAuth'] },
  layout: { require: ['requireLayoutAuth'], skip: ['skipLayoutAuth'] }, // layout and template files
  layoutMetadata: { require: ['requireLayoutMetadataAuth'] },
  page: { require: ['requirePageAuth'], skip: ['skipPageAuth'] }, // page and default files
  pageMetadata: { require: ['requirePageMetadataAuth'] },
  route: { require: ['requireRouteAuth'], skip: ['skipRouteAuth'] },
}
```

For example, for an app that wraps every entry point with `withAuth`:

```js
{
  files: ['app/**/*.ts', 'app/**/*.tsx', 'lib/**/*.ts'],
  ignores: ['app/api/auth/**'], // Better Auth's own handler
  rules: {
    '@alephic/require-auth-wrapper': [
      'error',
      {
        action: { require: ['withAuth'] },
        layout: { require: ['withAuth'] },
        layoutMetadata: { require: ['withAuth'] },
        page: { require: ['withAuth'] },
        pageMetadata: { require: ['withAuth'] },
        route: { require: ['withAuth'] },
      },
    ],
  },
}
```

To also catch session lookups outside the wrappers, add ESLint's
`no-restricted-syntax`, and disable it on the one line in the wrappers' module
that looks up the session:

```js
'no-restricted-syntax': [
  'error',
  {
    message: 'Wrap the entry point with withAuth() instead of looking up the session.',
    selector:
      "CallExpression > MemberExpression.callee[object.property.name='api'][property.name='getSession']",
  },
],
```
