---
name: DB push TTY workaround
description: drizzle-kit push requires a TTY and fails in non-interactive shells; use raw SQL instead
---

`pnpm --filter @workspace/db run push-force` (which runs `drizzle-kit push --force`) fails in non-TTY environments (CI, agent shell) with:
> Interactive prompts require a TTY terminal

**Why:** drizzle-kit push uses interactive prompts for conflict resolution even with `--force`.

**How to apply:** Use raw psql SQL to apply migrations:
```bash
psql $DATABASE_URL << 'SQL'
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_days integer NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS achievements (...);
SQL
```

Always use `IF NOT EXISTS` / `IF NOT EXISTS` to make migrations idempotent.
