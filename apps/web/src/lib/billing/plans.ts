export interface Plan {
  id: string;
  name: string;
  tagline: string;
  price: number;
  priceYearly: number;
  currency: string;
  minutesLimit: number;
  perMeetingMinutesLimit?: number;
  features: string[];
  stripePriceId?: string;
  stripePriceIdYearly?: string;
  highlighted?: boolean;
  perSeat?: boolean;
  contactOnly?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Basic',
    tagline: 'Try Briva on your own meetings.',
    price: 0,
    priceYearly: 0,
    currency: 'USD',
    minutesLimit: 100,
    perMeetingMinutesLimit: 60,
    features: [
      '100 minutes / month',
      'Up to 60 minutes per meeting',
      'Workspace with up to 2 members',
      'Live transcription with AI Q&A',
      '30+ languages with code-switching',
      'Structured summaries & action items',
      'Windows desktop app',
      'PDF, share-link & clipboard export',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For individuals running meetings every week.',
    price: 19,
    priceYearly: 190,
    currency: 'USD',
    minutesLimit: 3000,
    perMeetingMinutesLimit: 180,
    stripePriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    highlighted: true,
    features: [
      '3,000 minutes / month',
      'Up to 3 hours per meeting',
      'Workspace with up to 5 members',
      'Everything in Basic',
      'Email recap to attendees',
      'Priority transcription queue',
      'Speaker identification',
      'Google Calendar auto-link',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    tagline: 'For growing teams that need a shared library.',
    price: 15,
    priceYearly: 150,
    currency: 'USD',
    minutesLimit: 6000,
    perMeetingMinutesLimit: 240,
    stripePriceId: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_TEAM_YEARLY_PRICE_ID,
    perSeat: true,
    features: [
      '6,000 minutes per seat / month',
      'Up to 4 hours per meeting',
      'Unlimited workspace members',
      'Everything in Pro',
      'Shared workspace library',
      'Owner / admin / member roles',
      'Workspace admin controls',
      'Shared custom vocabulary',
      'Priority support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For organisations with custom needs.',
    price: 0,
    priceYearly: 0,
    currency: 'USD',
    minutesLimit: 0,
    contactOnly: true,
    features: [
      'Custom usage limits',
      'Unlimited workspace members',
      'Everything in Team',
      'SSO (SAML / OIDC)',
      'Dedicated success manager',
      'Custom data retention',
      'Audit logs',
      'Annual contracts with invoicing',
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
