---
name: Stripe + stripe-replit-sync setup quirks
description: Non-obvious issues when wiring Stripe via the Replit connector and stripe-replit-sync library.
---

## Credential key name

The Replit Stripe connector stores the secret as `settings.secret` (not `settings.secret_key`). 
The `stripeClient.ts` template in the skill uses `secret_key` which silently fails. 
Always check both: `const secretKey = settings?.secret ?? settings?.secret_key`.

**Why:** The Replit connector schema (`toonSchema`) lists `secret` and `publishable` as the required fields.

## runMigrations() creates the schema but not the tables

`stripe-replit-sync`'s `runMigrations({ databaseUrl })` only creates the `stripe` schema, 
not the tables themselves. The tables come from the numbered SQL files in 
`node_modules/stripe-replit-sync/dist/migrations/`.

**Fix:** Apply migrations manually via psql:
```bash
MIGRATIONS_DIR="/path/to/stripe-replit-sync/dist/migrations"
for f in $(ls $MIGRATIONS_DIR/*.sql | sort); do psql "$DATABASE_URL" -f "$f"; done
```

**How to apply:** Run this once after first setup. On subsequent restarts `runMigrations()` 
is idempotent and the tables already exist so it succeeds.

## Admin router blocks routes registered after it

The admin router uses `router.use(requireAdmin)` as a global middleware. Any route registered 
after `router.use(adminRouter)` in `routes/index.ts` will fail with 401/403 for unauthenticated 
requests because Express router middleware bleeds through to subsequent routers when they share 
the same parent router. 

**Fix:** Always register the stripe (and any public) router BEFORE `adminRouter` in `routes/index.ts`.

## Stripe product `tier` metadata

Products are created with `metadata: { tier: 'premium' | 'pro' }`. The `/api/stripe/prices` endpoint 
filters by this to return tier-to-priceId mappings to the frontend. Seed script: 
`scripts/src/seed-products.ts`.

## Migration tracking table is required

`applyStripeTableMigrations()` must track which files have been applied in `stripe._applied_migrations` 
(a simple `filename TEXT PRIMARY KEY` table). Without it, migrations re-run on every startup and 
re-add NOT NULL constraints that break the library's INSERT statements.

Also: the `_managed_webhooks` table ends up with both `account_id` and `_account_id` columns due to 
a partially-applied migration (0049). Fix with a BEFORE INSERT trigger that mirrors 
`account_id → _account_id` when `_account_id IS NULL`.

## Startup init error handling

The `initStripe()` function should catch errors gracefully so the server starts even when Stripe 
is misconfigured. Wrap with try/catch and log at ERROR level:
```ts
try { await initStripe(); } catch (err) { logger.error({ err }, 'Stripe init failed'); }
```
