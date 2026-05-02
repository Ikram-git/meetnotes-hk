import type { SupabaseClient } from '@supabase/supabase-js';
import { getStripe } from './stripe';

/**
 * Sync the Stripe subscription quantity for a workspace's owner to match
 * the current member count. Best-effort — if any step fails (no
 * subscription, owner is on free tier, Stripe down) we log and move on.
 *
 * Use the admin Supabase client so this can run from any context, including
 * from invite-accept which already uses the admin client.
 */
export async function syncWorkspaceSeats(
  admin: SupabaseClient,
  workspaceId: string,
): Promise<void> {
  try {
    const { data: workspace } = await admin
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .maybeSingle();
    if (!workspace) return;

    const { data: owner } = await admin
      .from('profiles')
      .select('subscription_tier, stripe_subscription_id')
      .eq('id', workspace.owner_id)
      .maybeSingle();
    if (!owner?.stripe_subscription_id) return;
    if (owner.subscription_tier !== 'team') return;

    const { count } = await admin
      .from('workspace_members')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);
    const seats = Math.max(1, count ?? 1);

    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(owner.stripe_subscription_id);
    const item = subscription.items.data[0];
    if (!item) return;
    if (item.quantity === seats) return;

    await stripe.subscriptions.update(owner.stripe_subscription_id, {
      items: [{ id: item.id, quantity: seats }],
      proration_behavior: 'create_prorations',
    });
    console.log(`[seats] synced workspace ${workspaceId} to ${seats} seats`);
  } catch (err) {
    console.warn('[seats] sync failed:', err instanceof Error ? err.message : err);
  }
}
