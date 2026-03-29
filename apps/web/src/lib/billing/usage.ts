import { SupabaseClient } from '@supabase/supabase-js';
import { getPlanLimits } from './plans';

export interface UsageInfo {
  minutesUsed: number;
  minutesLimit: number;
  percentUsed: number;
  tier: string;
  isOverLimit: boolean;
}

export async function getUserUsage(supabase: SupabaseClient, userId: string): Promise<UsageInfo> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('minutes_used_this_month, minutes_limit, subscription_tier')
    .eq('id', userId)
    .single();

  const tier = profile?.subscription_tier || 'free';
  const limits = getPlanLimits(tier);
  const minutesUsed = profile?.minutes_used_this_month || 0;
  const minutesLimit = profile?.minutes_limit || limits.minutesLimit;

  return {
    minutesUsed,
    minutesLimit,
    percentUsed: minutesLimit > 0 ? Math.round((minutesUsed / minutesLimit) * 100) : 0,
    tier,
    isOverLimit: minutesUsed >= minutesLimit,
  };
}
