import app from "./app.js";
import { logger } from "./lib/logger.js";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from "./stripeClient.js";
import { pool } from "@workspace/db";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createRequire } from "node:module";

async function applyStripeTableMigrations(): Promise<void> {
  // runMigrations() only creates the `stripe` schema, not the tables.
  // We apply each numbered SQL file exactly once, tracked in a migrations table.
  const require = createRequire(import.meta.url);
  let migrationsDir: string;
  try {
    const mainEntry = require.resolve('stripe-replit-sync');
    migrationsDir = join(mainEntry, '..', 'migrations');
  } catch {
    logger.warn('Could not resolve stripe-replit-sync migrations directory');
    return;
  }

  let files: string[];
  try {
    files = (await readdir(migrationsDir)).filter(f => f.endsWith('.sql')).sort();
  } catch {
    logger.warn({ migrationsDir }, 'stripe-replit-sync migrations directory not found');
    return;
  }

  const client = await pool.connect();
  try {
    // Create a tracking table so each migration runs exactly once
    await client.query(`
      CREATE TABLE IF NOT EXISTS stripe._applied_migrations (
        filename text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query<{ filename: string }>(
      `SELECT filename FROM stripe._applied_migrations`
    );
    const applied = new Set(rows.map(r => r.filename));

    let newCount = 0;
    for (const file of files) {
      if (applied.has(file)) continue;

      const sql = await readFile(join(migrationsDir, file), 'utf8');
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO stripe._applied_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING`,
          [file]
        );
        newCount++;
        logger.debug({ file }, 'Applied stripe migration');
      } catch (err: any) {
        // Tolerate "already exists" errors (42P07 table, 42701 column, 42P06 schema, 42710 object)
        const toleratedCodes = new Set(['42P07', '42701', '42P06', '42710']);
        if (toleratedCodes.has(err.code)) {
          // Mark as applied so we skip it next time
          await client.query(
            `INSERT INTO stripe._applied_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING`,
            [file]
          );
          logger.debug({ file }, 'Stripe migration already applied, marking done');
        } else {
          logger.warn({ file, code: err.code, message: err.message }, 'Stripe migration warning — skipping');
          // Still mark as attempted to avoid re-running a broken migration on every start
          await client.query(
            `INSERT INTO stripe._applied_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING`,
            [file]
          );
        }
      }
    }

    logger.info({ total: files.length, new: newCount }, 'Stripe table migrations complete');
  } finally {
    client.release();
  }
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn('DATABASE_URL not set — skipping Stripe initialization');
    return;
  }

  try {
    logger.info('Initializing Stripe schema...');
    await runMigrations({ databaseUrl });
    logger.info('Stripe schema created');

    await applyStripeTableMigrations();

    const stripeSync = await getStripeSync();

    const domain = process.env.REPLIT_DOMAINS?.split(',')[0];
    if (domain) {
      const webhookUrl = `https://${domain}/api/stripe/webhook`;
      logger.info({ webhookUrl }, 'Setting up managed webhook...');
      await stripeSync.findOrCreateManagedWebhook(webhookUrl);
      logger.info('Webhook configured');
    }

    stripeSync.syncBackfill()
      .then(() => logger.info('Stripe data synced'))
      .catch((err) => logger.error({ err }, 'Stripe syncBackfill error'));
  } catch (err) {
    logger.error({ err }, 'Stripe initialization failed — app will continue without Stripe');
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

await initStripe();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
