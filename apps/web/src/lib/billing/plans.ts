export interface Plan {
  id: string;
  name: string;
  price: number;
  priceYearly: number;
  currency: string;
  minutesLimit: number;
  features: string[];
  stripePriceId?: string;
  stripePriceIdYearly?: string;
  highlighted?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceYearly: 0,
    currency: 'USD',
    minutesLimit: 100,
    features: [
      '100 minutes/month',
      '30+ languages auto-detected',
      'AI summaries & action items',
      'PDF & clipboard export',
      'Chrome extension',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19,
    priceYearly: 190,
    currency: 'USD',
    minutesLimit: 3000,
    stripePriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    highlighted: true,
    features: [
      '3,000 minutes/month',
      'Everything in Free',
      'Email export',
      'Priority transcription',
      'Speaker identification',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    price: 49,
    priceYearly: 490,
    currency: 'USD',
    minutesLimit: 10000,
    stripePriceId: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_TEAM_YEARLY_PRICE_ID,
    features: [
      '10,000 minutes/month',
      'Everything in Pro',
      'Team workspace',
      'Shared meeting library',
      'Admin controls',
      'Priority support',
    ],
  },
];

export function getPlanById(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

export function getPlanLimits(tier: string): { minutesLimit: number } {
  const plan = getPlanById(tier);
  return { minutesLimit: plan?.minutesLimit || 100 };
}
