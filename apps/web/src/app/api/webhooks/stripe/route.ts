import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  const stripe = getStripe();
  const supabase = getAdminSupabase();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  console.log(`[Stripe Webhook] ${event.type}`);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;
      const planId = session.metadata?.plan_id;
      const userId = session.metadata?.supabase_user_id;

      if (userId && !customerId) {
        // Link Stripe customer to profile if not already done
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: session.customer as string })
          .eq('id', userId);
      }

      // Log billing event
      if (userId) {
        await supabase.from('billing_events').insert({
          user_id: userId,
          event_type: 'subscription_created',
          stripe_event_id: event.id,
          metadata: { plan_id: planId, session_id: session.id },
        });
      }
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const priceId = subscription.items.data[0]?.price?.id;
      const quantity = subscription.items.data[0]?.quantity ?? 1;
      const tier = mapPriceToTier(priceId);
      // Team plan is per-seat; total monthly minute pool scales with seats.
      const minutesLimit =
        tier === 'team' ? 6000 * quantity : tier === 'pro' ? 3000 : 100;

      const { data: ownerProfile } = await supabase
        .from('profiles')
        .update({
          subscription_tier: tier,
          subscription_status: subscription.status === 'active' ? 'active'
            : subscription.status === 'past_due' ? 'past_due'
            : 'active',
          minutes_limit: minutesLimit,
          stripe_subscription_id: subscription.id,
        })
        .eq('stripe_customer_id', customerId)
        .select('id')
        .maybeSingle();

      // Push the new minute limit to all workspaces owned by this customer
      // so members of paid workspaces draw from the bigger pool.
      if (ownerProfile?.id) {
        await supabase
          .from('workspaces')
          .update({ minutes_limit: minutesLimit })
          .eq('owner_id', ownerProfile.id);
      }

      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const { data: ownerProfile } = await supabase
        .from('profiles')
        .update({
          subscription_tier: 'free',
          subscription_status: 'cancelled',
          minutes_limit: 100,
          stripe_subscription_id: null,
        })
        .eq('stripe_customer_id', customerId)
        .select('id')
        .maybeSingle();

      if (ownerProfile?.id) {
        await supabase
          .from('workspaces')
          .update({ minutes_limit: 100 })
          .eq('owner_id', ownerProfile.id);
      }

      // Log billing event
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (profile) {
        await supabase.from('billing_events').insert({
          user_id: profile.id,
          event_type: 'subscription_cancelled',
          stripe_event_id: event.id,
        });
      }
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (profile) {
        // Reset monthly usage on successful payment (new billing cycle)
        if (invoice.billing_reason === 'subscription_cycle') {
          await supabase
            .from('profiles')
            .update({ minutes_used_this_month: 0 })
            .eq('id', profile.id);
          await supabase.rpc('reset_owner_workspace_usage', {
            owner_id_in: profile.id,
          });
        }

        await supabase.from('billing_events').insert({
          user_id: profile.id,
          event_type: 'payment_succeeded',
          stripe_event_id: event.id,
          metadata: { amount: invoice.amount_paid, currency: invoice.currency },
        });
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({ subscription_status: 'past_due' })
          .eq('id', profile.id);

        await supabase.from('billing_events').insert({
          user_id: profile.id,
          event_type: 'payment_failed',
          stripe_event_id: event.id,
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

function mapPriceToTier(priceId: string | undefined): string {
  if (!priceId) return 'free';
  const proIds = [process.env.STRIPE_PRO_MONTHLY_PRICE_ID, process.env.STRIPE_PRO_YEARLY_PRICE_ID];
  const teamIds = [process.env.STRIPE_TEAM_MONTHLY_PRICE_ID, process.env.STRIPE_TEAM_YEARLY_PRICE_ID];
  if (proIds.includes(priceId)) return 'pro';
  if (teamIds.includes(priceId)) return 'team';
  return 'free';
}
