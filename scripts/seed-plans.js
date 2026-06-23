const { loadEnvConfig } = require('@next/env');
const { MongoClient } = require('mongodb');

loadEnvConfig(process.cwd());

const DB_NAME = 'thinkingminds';
const COLLECTION = 'plans';

const DEFAULT_PLANS = [
  {
    slug: 'free',
    name: 'Free Plan',
    description: 'Essential core modules for emerging teams. Perfect for small businesses getting started.',
    priceMonthly: 0,
    supportLevel: 'community',
    customizable: false,
    apiLimitMonthly: 1000,
    features: [
      'POS (Point of Sale)',
      'Finance & Accounting',
      'Inventory Management',
      'Procurement',
      'HR & Payroll',
      'Community email support (48h SLA)',
      'Basic reporting & analytics',
      'Up to 5 team members',
    ],
  },
  {
    slug: 'pro',
    name: 'Pro Plan',
    description: 'Full Thinking Minds platform with advanced automation and priority support.',
    priceMonthly: 199,
    supportLevel: 'priority',
    customizable: true,
    apiLimitMonthly: 50000,
    features: [
      'All core modules & features',
      'Unlimited team members',
      'Advanced analytics & reporting',
      'Priority support (4h SLA)',
      'Dedicated account manager',
      'Custom workflows & approvals',
      'Custom software extensions',
      'API access & integrations',
      'White-label options',
    ],
  },
  {
    slug: 'enterprise',
    name: 'Customized Plan',
    description: 'Fully customized enterprise solution tailored to your business needs with dedicated support.',
    priceMonthly: 0,
    supportLevel: 'dedicated',
    customizable: true,
    apiLimitMonthly: 1000000,
    features: [
      'All Pro features included',
      'Fully customized software development',
      'Dedicated support team (1h SLA)',
      'On-site implementation & training',
      'Custom integrations & API development',
      'Dedicated infrastructure (if needed)',
      'SLA guarantees & uptime commitments',
      'Custom security & compliance features',
      'Unlimited API calls',
      'Source code access (negotiable)',
      'Multi-tenant & white-label solutions',
      'Priority feature requests',
    ],
  },
];

async function seedPlans() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined');
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);

    // Seed plans
    let freePlanId = null;
    for (const plan of DEFAULT_PLANS) {
      const result = await collection.updateOne(
        { slug: plan.slug },
        { $setOnInsert: plan },
        { upsert: true }
      );
      
      // Get the free plan ID for assigning to orgs
      if (plan.slug === 'free') {
        const freePlan = await collection.findOne({ slug: 'free' });
        if (freePlan) {
          freePlanId = freePlan._id;
        }
      }
    }

    console.log('Default plans seeded successfully.');

    // Ensure all orgs have a planId
    if (freePlanId) {
      const orgsCollection = db.collection('orgs');
      const updateResult = await orgsCollection.updateMany(
        { planId: { $exists: false } },
        { $set: { planId: freePlanId } }
      );
      
      if (updateResult.modifiedCount > 0) {
        console.log(`Assigned free plan to ${updateResult.modifiedCount} organization(s) that were missing a plan.`);
      }
    }
  } finally {
    await client.close();
  }
}

seedPlans().catch((error) => {
  console.error('Failed to seed plans:', error);
  process.exit(1);
});

