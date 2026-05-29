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
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: session.customer as string })
          .eq('id', userId);
      }

      if (userId) {
        await supabase.from('billing_events').insert({
          user_id: userId,
          event_type: 'subscription_created',
          stripe_event_id: event.id,
          metadata: { plan_id: planId, session_id: session.id },
        });
      }

      // Send payment confirmation email
      const customerEmail = session.customer_details?.email;
      const customerName = session.customer_details?.name || 'there';
      const planName = planId === 'pro' ? 'Pro' : planId === 'team' ? 'Team' : 'Briva';
      if (customerEmail && process.env.RESEND_API_KEY) {
        try {
          const { Resend } = await import('resend');
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: 'Briva <noreply@meetbriva.com>',
            to: customerEmail,
            subject: `Welcome to Briva ${planName} — you're all set`,
            html: `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111;line-height:1.6;font-size:15px;padding:0;margin:0;background:#f9fafb;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <tr><td style="background:#0a1310;padding:28px 32px;">
        <p style="margin:0;font-size:20px;font-weight:700;color:#fff;">Briva <em style="color:#10b981;font-style:italic;">Hear Beyond Words.</em></p>
      </td></tr>
      <tr><td style="padding:32px;">
        <h1 style="margin:0 0 8px;font-size:22px;color:#111;">Welcome to ${planName}, ${customerName}!</h1>
        <p style="margin:0 0 24px;color:#4b5563;">Your subscription is active and your account has been upgraded. Here's what you now have access to:</p>
        ${planId === 'pro' ? `
        <ul style="margin:0 0 24px;padding-left:20px;color:#374151;">
          <li style="margin-bottom:6px;">3,000 minutes of transcription per month</li>
          <li style="margin-bottom:6px;">Up to 3-hour meetings</li>
          <li style="margin-bottom:6px;">Email recap to attendees</li>
          <li style="margin-bottom:6px;">Speaker identification</li>
          <li style="margin-bottom:6px;">Google Calendar auto-link</li>
        </ul>` : planId === 'team' ? `
        <ul style="margin:0 0 24px;padding-left:20px;color:#374151;">
          <li style="margin-bottom:6px;">6,000 minutes per seat per month</li>
          <li style="margin-bottom:6px;">Up to 4-hour meetings</li>
          <li style="margin-bottom:6px;">Unlimited workspace members</li>
          <li style="margin-bottom:6px;">Shared workspace library</li>
          <li style="margin-bottom:6px;">Owner / admin / member roles</li>
        </ul>` : ''}
        <a href="https://meetbriva.com/meetings" style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">Open dashboard</a>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 24px;">
        <p style="margin:0;color:#6b7280;font-size:13px;">Questions? Reply to this email or reach us at <a href="mailto:support@meetbriva.com" style="color:#10b981;">support@meetbriva.com</a>. We typically respond within one business day.</p>
      </td></tr>
      <tr><td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;">
        <p style="margin:0;color:#9ca3af;font-size:12px;">Briva · meetbriva.com · <a href="https://meetbriva.com/settings/billing" style="color:#9ca3af;">Manage subscription</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
            text: `Welcome to Briva ${planName}, ${customerName}!\n\nYour subscription is active. Open your dashboard at https://meetbriva.com/meetings\n\nQuestions? Email support@meetbriva.com`,
          });
        } catch (err) {
          console.error('[Stripe Webhook] Failed to send confirmation email:', err);
        }
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
          minutes_limit: 300,
          stripe_subscription_id: null,
        })
        .eq('stripe_customer_id', customerId)
        .select('id')
        .maybeSingle();

      if (ownerProfile?.id) {
        await supabase
          .from('workspaces')
          .update({ minutes_limit: 300 })
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
