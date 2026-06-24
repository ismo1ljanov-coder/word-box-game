import { getUncachableStripeClient } from './stripeClient.js';
import { db } from '@workspace/db';
import { usersTable } from '@workspace/db';
import { eq, sql } from 'drizzle-orm';
import { logger } from './lib/logger.js';

export class StripeService {
  async getOrCreateCustomer(userId: number, phone: string): Promise<string> {
    const [user] = await db.select({ stripeCustomerId: usersTable.stripeCustomerId })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (user?.stripeCustomerId) return user.stripeCustomerId;

    const stripe = await getUncachableStripeClient();
    const customer = await stripe.customers.create({
      phone,
      metadata: { userId: String(userId) },
    });

    await db.update(usersTable)
      .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));

    logger.info({ userId, customerId: customer.id }, 'Created Stripe customer');
    return customer.id;
  }

  async createCheckoutSession(params: {
    customerId: string;
    userId: number;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<string> {
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.create({
      customer: params.customerId,
      client_reference_id: String(params.userId),
      payment_method_types: ['card'],
      line_items: [{ price: params.priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      allow_promotion_codes: true,
    });

    if (!session.url) throw new Error('Stripe checkout session URL is null');
    return session.url;
  }

  async createPortalSession(customerId: string, returnUrl: string): Promise<string> {
    const stripe = await getUncachableStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return session.url;
  }

  async listPricesWithProducts(): Promise<Array<{
    priceId: string;
    productId: string;
    productName: string;
    tier: string;
    unitAmount: number;
    currency: string;
    interval: string;
  }>> {
    const stripe = await getUncachableStripeClient();
    const prices = await stripe.prices.list({ active: true, expand: ['data.product'], limit: 100 });

    return prices.data
      .filter(p => {
        const product = p.product as import('stripe').Stripe.Product;
        return product.active && product.metadata?.tier;
      })
      .map(p => {
        const product = p.product as import('stripe').Stripe.Product;
        return {
          priceId: p.id,
          productId: product.id,
          productName: product.name,
          tier: product.metadata.tier,
          unitAmount: p.unit_amount ?? 0,
          currency: p.currency,
          interval: p.recurring?.interval ?? 'month',
        };
      });
  }
}

export const stripeService = new StripeService();
