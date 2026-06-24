import { Router } from 'express';
import { db } from '@workspace/db';
import { usersTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { stripeService } from '../stripeService.js';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../lib/logger.js';

const router = Router();

router.get('/stripe/prices', async (_req, res) => {
  try {
    const prices = await stripeService.listPricesWithProducts();
    res.json({ data: prices });
  } catch (err) {
    logger.error({ err }, 'Failed to list Stripe prices');
    res.status(500).json({ error: 'To\'lov tizimi vaqtincha mavjud emas' });
  }
});

router.post('/stripe/checkout', requireAuth, async (req, res) => {
  const { priceId } = req.body;
  if (!priceId || typeof priceId !== 'string') {
    res.status(400).json({ error: 'priceId majburiy' });
    return;
  }

  const userId = req.user!.id;
  const user = req.user!;

  try {
    const customerId = await stripeService.getOrCreateCustomer(userId, user.phone);

    const domain = process.env.REPLIT_DOMAINS?.split(',')[0];
    const baseUrl = domain ? `https://${domain}` : 'http://localhost:3000';

    const checkoutUrl = await stripeService.createCheckoutSession({
      customerId,
      userId,
      priceId,
      successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/premium`,
    });

    res.json({ url: checkoutUrl });
  } catch (err) {
    logger.error({ err }, 'Checkout session creation failed');
    res.status(500).json({ error: 'Checkout sessiyasini yaratib bo\'lmadi' });
  }
});

router.post('/stripe/portal', requireAuth, async (req, res) => {
  const userId = req.user!.id;

  const [user] = await db.select({ stripeCustomerId: usersTable.stripeCustomerId })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user?.stripeCustomerId) {
    res.status(400).json({ error: 'Stripe hisobi topilmadi' });
    return;
  }

  try {
    const domain = process.env.REPLIT_DOMAINS?.split(',')[0];
    const returnUrl = domain ? `https://${domain}/premium` : 'http://localhost:3000/premium';

    const portalUrl = await stripeService.createPortalSession(user.stripeCustomerId, returnUrl);
    res.json({ url: portalUrl });
  } catch (err) {
    logger.error({ err }, 'Portal session creation failed');
    res.status(500).json({ error: 'Portal sessiyasini yaratib bo\'lmadi' });
  }
});

export default router;
