---
name: typescript-exhaustive-switch
description: Use exhaustive switch handling for TypeScript unions and enums. Applies whenever editing TypeScript source files.
paths: ["**/*.ts", "**/*.tsx"]
---

# Exhaustive switch

In switch statements over discriminated unions or enums, use a `never` check in the default case so newly added variants cause compile-time failures until handled.

```ts
default: {
  const _exhaustive: never = value;
  throw new Error(`Unhandled variant: ${String(_exhaustive)}`);
}
```
