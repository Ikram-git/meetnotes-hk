import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/billing/stripe';
import { PLANS } from '@/lib/billing/plans';
import { getActiveWorkspaceId } from '@/lib/workspace';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { planId, interval = 'monthly' } = await req.json();
  const plan = PLANS.find((p) => p.id === planId);

  if (!plan) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  if (plan.contactOnly) {
    return NextResponse.json({ error: 'Contact sales for this plan' }, { status: 400 });
  }

  // Check if user already has this plan
  const { data: profile } = await supabase
    .from('profiles').select('subscription_tier, stripe_customer_id, email').eq('id', user.id).single();

  if (profile?.subscription_tier === planId) {
    return NextResponse.json({ error: 'You are already subscribed to this plan' }, { status: 400 });
  }

  const priceId = interval === 'yearly' ? plan.stripePriceIdYearly : plan.stripePriceId;
  if (!priceId) return NextResponse.json({ error: 'Stripe not configured for this plan' }, { status: 400 });

  // For per-seat plans, count members in the active workspace and pass as
  // Stripe checkout quantity. Customer can adjust later via the billing portal.
  let quantity = 1;
  let workspaceId: string | null = null;
  if (plan.perSeat) {
    workspaceId = await getActiveWorkspaceId(supabase, user.id);
    if (workspaceId) {
      const { count } = await supabase
        .from('workspace_members')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);
      quantity = Math.max(1, count ?? 1);
    }
  }

  try {
    const stripe = getStripe();

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
      line_items: [{ price: priceId, quantity }],
      success_url: `${appUrl}/settings/billing?success=true`,
      cancel_url: `${appUrl}/settings/billing?cancelled=true`,
      metadata: {
        supabase_user_id: user.id,
        plan_id: planId,
        workspace_id: workspaceId ?? '',
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan_id: planId,
          workspace_id: workspaceId ?? '',
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Checkout failed' },
      { status: 500 }
    );
  }
}
