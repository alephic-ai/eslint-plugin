# @alephic-ai/test-exercises-code

📝 Require test describe/it titles to name identifiers that the file actually references, so tests exercise the real code instead of a parallel reimplementation.

💼 This rule is enabled in the ✅ `recommended` config.

<!-- end auto-generated rule header -->

Flags tests whose `describe`/`it` titles name a code identifier the file never
references. Catches "parallel reimplementation" — where a test's body rewrites
the function inline instead of calling it, so the assertions check the test's
own reimplementation rather than the real code.

Detection is narrow by design: an identifier is only flagged when it has an
internal camelCase transition **and** ends in a known code suffix (`Step`,
`Service`, `Workflow`, `Handler`, `Client`, `Adapter`, `Repository`, `Provider`,
`Factory`, `Resolver`, `Controller`, `Middleware`, `Component`, `Schema`, `Ref`,
`Reducer`). False negatives are fine; false positives train developers to
suppress the rule.

## Examples

❌ Incorrect:

```ts
import { describe, expect, it } from 'vitest'

describe('fetchFooStep', () => {
  // fetchFooStep is never imported or called
  it('does a thing', () => {
    expect(1).toBe(1)
  })
})
```

✅ Correct:

```ts
import { describe, expect, it } from 'vitest'

import { fetchFooStep } from './foo'

describe('fetchFooStep', () => {
  it('returns something', () => {
    expect(fetchFooStep()).toBeTruthy()
  })
})
```
