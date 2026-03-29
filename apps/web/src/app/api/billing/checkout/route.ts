import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/billing/stripe';
import { PLANS } from '@/lib/billing/plans';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { planId, interval = 'monthly' } = await req.json();
  const plan = PLANS.find((p) => p.id === planId);

  if (!plan) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

  const priceId = interval === 'yearly' ? plan.stripePriceIdYearly : plan.stripePriceId;
  if (!priceId) return NextResponse.json({ error: 'Stripe not configured for this plan' }, { status: 400 });

  try {
    const stripe = getStripe();

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles').select('stripe_customer_id, email').eq('id', user.id).single();

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || profile?.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/settings/billing?success=true`,
      cancel_url: `${appUrl}/settings/billing?cancelled=true`,
      metadata: { supabase_user_id: user.id, plan_id: planId },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Checkout failed' },
      { status: 500 }
    );
  }
}
