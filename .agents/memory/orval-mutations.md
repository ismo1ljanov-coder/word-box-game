---
name: Orval mutation signatures
description: How Orval-generated React Query mutation hooks expect their arguments structured
---

Orval generates mutation hooks where arguments are structured as:
- Body-only mutations: `mutate({ data: BodyType })`
- Path param + body: `mutate({ paramName: value, data: BodyType })`
- Path param only: `mutate({ paramName: value })`

The path param name matches the OpenAPI path parameter name exactly (e.g., `{wordId}` in the path → `wordId` in the mutation arg, NOT `id`).

**Why:** Orval generates discriminated union props based on the spec param names, not generic `id`.

**How to apply:** When calling any generated mutation hook, always use `{ data: ... }` to wrap the body, and use the exact OpenAPI path param name for path parameters.

When OpenAPI has `enum` values on an integer field (e.g. `dailyGoalTarget: integer, enum: [10,20,30,50]`), Orval generates a named const enum type. Cast with `goal as UpdateProfileInputDailyGoalTarget` or import the type.
