import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey || stripeKey === 'sk_test_placeholder') {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 400 });
  }

  const stripe = new Stripe(stripeKey);

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    // Try to find customer by email
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    if (customers.data.length === 0) {
      return NextResponse.json({ synced: false, tier: 'free' });
    }
    customerId = customers.data[0].id;
    await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
  }

  // Get active subscriptions
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 1,
  });

  if (subscriptions.data.length === 0) {
    // No active subscription — set to free
    await supabase.from('profiles').update({
      subscription_tier: 'free',
      subscription_status: 'active',
      minutes_limit: 300,
    }).eq('id', user.id);
    return NextResponse.json({ synced: true, tier: 'free' });
  }

  const sub = subscriptions.data[0];
  const priceId = sub.items.data[0]?.price?.id;

  // Map price to tier
  const proIds = [process.env.STRIPE_PRO_MONTHLY_PRICE_ID, process.env.STRIPE_PRO_YEARLY_PRICE_ID];
  const teamIds = [process.env.STRIPE_TEAM_MONTHLY_PRICE_ID, process.env.STRIPE_TEAM_YEARLY_PRICE_ID];

  let tier = 'free';
  let minutesLimit = 300;
  if (proIds.includes(priceId)) { tier = 'pro'; minutesLimit = 3000; }
  if (teamIds.includes(priceId)) { tier = 'team'; minutesLimit = 10000; }

  await supabase.from('profiles').update({
    subscription_tier: tier,
    subscription_status: 'active',
    minutes_limit: minutesLimit,
  }).eq('id', user.id);

  return NextResponse.json({ synced: true, tier });
}
