/**
 * Tier-gated feature flags. Single source of truth for "what can a user
 * on tier X actually do" — keep this aligned with the marketing copy in
 * apps/web/src/lib/billing/plans.ts.
 */

export type SubscriptionTier = 'free' | 'pro' | 'team' | 'enterprise';

export interface TierGates {
  /** Hard cap on per-meeting duration in MINUTES. null = unlimited. */
  perMeetingMinutes: number | null;
  /** Email recap to attendees (POST /api/meetings/[id]/export/email). */
  emailRecap: boolean;
  /** Google Calendar OAuth + auto-link recordings to events. */
  calendarSync: boolean;
  /** Rename speakers in transcripts (PUT /api/meetings/[id]/speakers). */
  speakerNaming: boolean;
  /** Maximum members in a workspace. null = unlimited. */
  maxWorkspaceMembers: number | null;
  /** Per-meeting and cross-meeting BRIVA AI chat. */
  briveAiChat: boolean;
  /** Comments on meetings. */
  meetingComments: boolean;
  /** Tasks board, assignment, status tracking. */
  tasks: boolean;
}

const GATES: Record<SubscriptionTier, TierGates> = {
  free: {
    perMeetingMinutes: 60,
    emailRecap: false,
    calendarSync: false,
    speakerNaming: false,
    maxWorkspaceMembers: 2,           // solo + 1 invited collaborator
    briveAiChat: true,
    meetingComments: true,
    tasks: true,
  },
  pro: {
    perMeetingMinutes: 180,
    emailRecap: true,
    calendarSync: true,
    speakerNaming: true,
    maxWorkspaceMembers: 5,           // small team / Pro is "individual+helpers"
    briveAiChat: true,
    meetingComments: true,
    tasks: true,
  },
  team: {
    perMeetingMinutes: 240,
    emailRecap: true,
    calendarSync: true,
    speakerNaming: true,
    maxWorkspaceMembers: null,        // billed per seat — no hard cap
    briveAiChat: true,
    meetingComments: true,
    tasks: true,
  },
  enterprise: {
    perMeetingMinutes: null,
    emailRecap: true,
    calendarSync: true,
    speakerNaming: true,
    maxWorkspaceMembers: null,
    briveAiChat: true,
    meetingComments: true,
    tasks: true,
  },
};

export function getGates(tier: string | null | undefined): TierGates {
  if (tier && tier in GATES) return GATES[tier as SubscriptionTier];
  return GATES.free;
}

export function tierUpgradeMessage(featureName: string, requiredTier: SubscriptionTier = 'pro'): string {
  return `${featureName} is available on ${requiredTier === 'pro' ? 'Pro' : 'Team'} and above. Upgrade in Settings → Billing to unlock.`;
}
