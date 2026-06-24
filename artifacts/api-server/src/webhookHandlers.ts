import { getStripeSync, getUncachableStripeClient } from './stripeClient.js';
import { db } from '@workspace/db';
import { usersTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { logger } from './lib/logger.js';

type SubscriptionTier = 'free' | 'premium' | 'pro';

async function getTierFromSubscription(subscriptionId: string): Promise<SubscriptionTier | null> {
  try {
    const stripe = await getUncachableStripeClient();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price.product'],
    });

    for (const item of subscription.items.data) {
      const product = item.price.product as import('stripe').Stripe.Product;
      const tier = product.metadata?.tier as SubscriptionTier | undefined;
      if (tier === 'premium' || tier === 'pro') {
        return tier;
      }
    }
    return null;
  } catch (err) {
    logger.error({ err }, 'Failed to get tier from subscription');
    return null;
  }
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();

    // Let stripe-replit-sync handle signature verification — it has the correct
    // webhook secret. If verification fails, it throws and we return a 400.
    await sync.processWebhook(payload, signature);

    // Parse the event from the raw payload (already verified above).
    // We do NOT call constructEvent ourselves because the webhook secret may not
    // be available in all environments; verification was already done by processWebhook.
    let event: import('stripe').Stripe.Event;
    try {
      event = JSON.parse(payload.toString('utf8')) as import('stripe').Stripe.Event;
    } catch (err) {
      logger.error({ err }, 'Failed to parse Stripe webhook payload as JSON');
      return;
    }

    await WebhookHandlers.handleEvent(event);
  }

  static async handleEvent(event: import('stripe').Stripe.Event): Promise<void> {
    logger.info({ type: event.type }, 'Stripe webhook event');

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as import('stripe').Stripe.Checkout.Session;
        const clientRefId = session.client_reference_id;
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

        if (!clientRefId || !subscriptionId) break;

        const userId = parseInt(clientRefId, 10);
        if (isNaN(userId)) break;

        const tier = await getTierFromSubscription(subscriptionId);
        if (!tier) break;

        await db.update(usersTable)
          .set({
            subscriptionTier: tier,
            stripeCustomerId: customerId ?? undefined,
            stripeSubscriptionId: subscriptionId,
            updatedAt: new Date(),
          })
          .where(eq(usersTable.id, userId));

        logger.info({ userId, tier, subscriptionId }, 'Subscription activated');
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as import('stripe').Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

        const [user] = await db.select({ id: usersTable.id })
          .from(usersTable)
          .where(eq(usersTable.stripeCustomerId, customerId))
          .limit(1);

        if (!user) break;

        if (subscription.status === 'active' || subscription.status === 'trialing') {
          const tier = await getTierFromSubscription(subscription.id);
          if (tier) {
            await db.update(usersTable)
              .set({ subscriptionTier: tier, stripeSubscriptionId: subscription.id, updatedAt: new Date() })
              .where(eq(usersTable.id, user.id));
            logger.info({ userId: user.id, tier }, 'Subscription updated');
          }
        } else if (
          subscription.status === 'canceled' ||
          subscription.status === 'unpaid' ||
          subscription.status === 'past_due'
        ) {
          await db.update(usersTable)
            .set({ subscriptionTier: 'free', stripeSubscriptionId: null, updatedAt: new Date() })
            .where(eq(usersTable.id, user.id));
          logger.info({ userId: user.id }, 'Subscription downgraded to free');
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as import('stripe').Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

        const [user] = await db.select({ id: usersTable.id })
          .from(usersTable)
          .where(eq(usersTable.stripeCustomerId, customerId))
          .limit(1);

        if (!user) break;

        await db.update(usersTable)
          .set({ subscriptionTier: 'free', stripeSubscriptionId: null, updatedAt: new Date() })
          .where(eq(usersTable.id, user.id));

        logger.info({ userId: user.id }, 'Subscription deleted, downgraded to free');
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as import('stripe').Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        if (!customerId) break;

        const [user] = await db.select({ id: usersTable.id })
          .from(usersTable)
          .where(eq(usersTable.stripeCustomerId, customerId))
          .limit(1);

        if (!user) break;

        const attemptCount = (invoice as any).attempt_count ?? 1;
        logger.warn({ userId: user.id, attemptCount }, 'Invoice payment failed');

        // Downgrade immediately after 3 failed attempts (Stripe's default retry count).
        // Stripe also fires customer.subscription.updated with status=past_due/canceled
        // on its own schedule; this is an extra safety net for faster enforcement.
        if (attemptCount >= 3) {
          await db.update(usersTable)
            .set({ subscriptionTier: 'free', stripeSubscriptionId: null, updatedAt: new Date() })
            .where(eq(usersTable.id, user.id));
          logger.warn({ userId: user.id }, 'Downgraded to free after repeated payment failures');
        }
        break;
      }
    }
  }
}
