import { RuleTester } from '@typescript-eslint/rule-tester'
import { afterAll, describe, it } from 'vitest'

import { rule } from './require-auth-wrapper.ts'

RuleTester.afterAll = afterAll
RuleTester.describe = describe
RuleTester.it = it

const helpers = `import { skipActionAuth, skipLayoutAuth, skipPageAuth, skipRouteAuth } from '@/auth/skip-auth'\nimport { requireActionAuth, requireLayoutAuth, requireLayoutMetadataAuth, requirePageAuth, requirePageMetadataAuth, requireRouteAuth } from '@/auth/require-auth'\n`

const directive = "'use server'\n"

// A directive only counts before the imports
function file(filename: string, code: string) {
  return {
    code: code.startsWith(directive)
      ? directive + helpers + code.slice(directive.length)
      : helpers + code,
    filename,
  }
}

function invalid(
  filename: string,
  code: string,
  ...messageIds: ('inlineAction' | 'unnamedExport' | 'unwrapped')[]
) {
  return {
    ...file(filename, code),
    errors: messageIds.map((messageId) => ({ messageId })),
  }
}

new RuleTester({
  languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
}).run('require-auth-wrapper', rule, {
  invalid: [
    invalid(
      'src/app/page.tsx',
      'export default function Page() { return null }',
      'unwrapped',
    ),
    invalid(
      'src/app/page.tsx',
      'const Page = requirePageAuth(() => null)\nexport { Page as default }',
      'unwrapped',
    ),
    // A page needs the page wrapper, not another entry point's
    invalid(
      'src/app/page.tsx',
      'export default requireLayoutAuth(() => null)',
      'unwrapped',
    ),
    // A same-named function that isn't the helper doesn't count
    {
      code: 'const requirePageAuth = (page) => page\nexport default requirePageAuth(() => null)',
      errors: [{ messageId: 'unwrapped' }],
      filename: 'src/app/page.tsx',
    },
    invalid(
      'src/app/page.tsx',
      'export default requirePageAuth(() => null)\nexport async function generateMetadata() { return {} }',
      'unwrapped',
    ),
    // Exports the rule can't name could hide generateMetadata
    invalid(
      'src/app/page.tsx',
      "export default requirePageAuth(() => null)\nexport * from './metadata'\nexport const { generateMetadata } = metadata",
      'unnamedExport',
      'unnamedExport',
    ),
    // A layout's metadata needs the layout metadata wrapper
    invalid(
      'src/app/(protected)/layout.tsx',
      'export default requireLayoutAuth((_session, props) => props.children)\nexport const generateMetadata = requirePageMetadataAuth(() => ({}))',
      'unwrapped',
    ),
    invalid(
      'src/app/(protected)/layout.tsx',
      'export default function Layout(props) { return props.children }',
      'unwrapped',
    ),
    invalid(
      'src/app/api/notes/route.ts',
      'export async function GET() { return new Response() }\nexport const POST = withLogging(requireRouteAuth(() => new Response()))',
      'unwrapped',
      'unwrapped',
    ),
    invalid(
      'src/app/api/notes/route.ts',
      "export { GET } from './handlers'\nexport * from './more-handlers'\nexport const { POST } = handlers",
      'unwrapped',
      'unnamedExport',
      'unnamedExport',
    ),
    invalid(
      'src/notes/note-actions.ts',
      "'use server'\nexport async function saveNote() {}\nexport const deleteNote = async () => {}",
      'unwrapped',
      'unwrapped',
    ),
    invalid(
      'src/notes/note-form.tsx',
      "export function NoteForm() {\n  async function save() {\n    'use server'\n  }\n  return <form action={save} />\n}",
      'inlineAction',
    ),
    // Configured wrappers
    {
      code: "import { withSession } from '~/lib/session'\nexport default withSession(() => null)",
      errors: [
        {
          data: { name: 'default', wrappers: 'guardPage()' },
          messageId: 'unwrapped',
        },
      ],
      filename: 'app/page.tsx',
      options: [{ page: { require: ['guardPage'] } }],
    },
    // A kind you pass replaces its default, skip wrappers included
    {
      ...file('src/app/page.tsx', 'export default skipPageAuth(() => null)'),
      errors: [
        {
          data: { name: 'default', wrappers: 'guardPage()' },
          messageId: 'unwrapped',
        },
      ],
      options: [{ page: { require: ['guardPage'] } }],
    },
  ],
  valid: [
    file(
      'src/app/page.tsx',
      "export const metadata = { title: 'Home' }\nexport default requirePageAuth(() => null)\nexport const generateMetadata = requirePageMetadataAuth(() => ({}))",
    ),
    // A page that skips auth needs no session for its metadata
    file(
      'src/app/auth/[path]/page.tsx',
      "export default skipPageAuth<'/auth/[path]'>(async (props) => null)\nexport function generateMetadata() { return {} }\nexport function generateStaticParams() { return [] }",
    ),
    file(
      'src/app/(protected)/layout.tsx',
      'export default requireLayoutAuth((_session, props) => props.children)\nexport const generateMetadata = requireLayoutMetadataAuth(() => ({}))',
    ),
    file(
      'src/app/layout.tsx',
      'export default skipLayoutAuth((props) => props.children)',
    ),
    file(
      'src/app/api/notes/route.ts',
      'export const dynamic = "force-dynamic"\nexport const GET = requireRouteAuth(() => new Response())\nexport const POST = skipRouteAuth(() => new Response())',
    ),
    file(
      'src/notes/note-actions.ts',
      "'use server'\nexport type Note = { text: string }\nexport const saveNote = requireActionAuth(async (session, text: string) => {})\nexport const subscribe = skipActionAuth(async (email: string) => {})",
    ),
    // An aliased import is still the helper
    {
      code: "import { requirePageAuth as authed } from '../../auth/require-auth'\nexport default authed(() => null)",
      filename: 'src/app/notes/page.tsx',
    },
    {
      code: "import requirePageAuth from '@/auth/require-page-auth'\nexport default requirePageAuth(() => null)",
      filename: 'src/app/page.tsx',
    },
    // Type assertions don't change what runs
    file(
      'src/app/api/notes/route.ts',
      'export const GET = requireRouteAuth(() => new Response()) satisfies RouteHandler\nexport const POST = requireRouteAuth(() => new Response()) as RouteHandler',
    ),
    // A configured skip wrapper also exempts the page's metadata
    {
      code: "import { openPage } from '~/lib/session'\nexport default openPage(() => null)\nexport function generateMetadata() { return {} }",
      filename: 'app/page.tsx',
      options: [{ page: { require: ['guardPage'], skip: ['openPage'] } }],
    },
    // Configured wrappers, from any module, in an `app` directory at the root
    {
      code: "import { guardPage } from '~/lib/session'\nexport default guardPage(() => null)",
      filename: 'app/(main)/page.tsx',
      options: [{ page: { require: ['guardPage'] } }],
    },
    // Outside an app directory, pages aren't entry points
    {
      code: 'export default function Page() { return null }',
      filename: 'src/routes/page.tsx',
    },
    // Only entry points are checked
    file(
      'src/notes/note-list.tsx',
      'export function NoteList() { return null }',
    ),
  ],
})
