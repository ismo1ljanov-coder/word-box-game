import { getUncachableStripeClient } from './stripeClient.js';

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  console.log('Creating Wordbox subscription products in Stripe...');

  const existingPremium = await stripe.products.search({
    query: "metadata['tier']:'premium' AND active:'true'",
  });

  if (existingPremium.data.length === 0) {
    const premiumProduct = await stripe.products.create({
      name: 'Wordbox Premium',
      description: 'B1/B2 so\'zlar, imlo o\'yini, kengaytirilgan statistika',
      metadata: { tier: 'premium' },
    });
    console.log(`Created Premium product: ${premiumProduct.id}`);

    const premiumPrice = await stripe.prices.create({
      product: premiumProduct.id,
      unit_amount: 490,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { tier: 'premium' },
    });
    console.log(`Created Premium price: ${premiumPrice.id} ($4.90/month ≈ 49 000 UZS)`);
  } else {
    console.log('Premium product already exists, skipping.');
    console.log(`Existing Premium product ID: ${existingPremium.data[0].id}`);
  }

  const existingPro = await stripe.products.search({
    query: "metadata['tier']:'pro' AND active:'true'",
  });

  if (existingPro.data.length === 0) {
    const proProduct = await stripe.products.create({
      name: 'Wordbox Pro',
      description: 'Barcha C1/C2 so\'zlar, anagram, speed quiz va AI tavsiyalar',
      metadata: { tier: 'pro' },
    });
    console.log(`Created Pro product: ${proProduct.id}`);

    const proPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 990,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { tier: 'pro' },
    });
    console.log(`Created Pro price: ${proPrice.id} ($9.90/month ≈ 99 000 UZS)`);
  } else {
    console.log('Pro product already exists, skipping.');
    console.log(`Existing Pro product ID: ${existingPro.data[0].id}`);
  }

  console.log('\n✓ Done! Run "pnpm --filter @workspace/scripts exec tsx src/seed-products.ts" to re-run.');
}

createProducts().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
