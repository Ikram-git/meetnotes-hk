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
    currency: 'HKD',
    minutesLimit: 300,
    features: [
      '300 minutes/month',
      'English + Cantonese transcription',
      'AI summaries & action items',
      'PDF & clipboard export',
      'Chrome extension',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 150,
    priceYearly: 1500,
    currency: 'HKD',
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
      'Notion & Slack export',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    price: 380,
    priceYearly: 3800,
    currency: 'HKD',
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
  return { minutesLimit: plan?.minutesLimit || 300 };
}
