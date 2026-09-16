---
name: no-inline-imports
description: Keep imports at the top of the module and avoid inline imports. Applies whenever editing TypeScript or JavaScript source files.
paths: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.mjs"]
---

# No inline imports

Always place imports at the top of the module. Avoid inline imports in function bodies, type annotations, or interface fields unless there is a strict circular-dependency reason and it is documented.
