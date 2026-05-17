// GBrain adapter — durable memory persistence per org.
// This is the *label*: every memory write goes through this surface so callers
// don't reach into orgs.ts directly. The backing store today is the local
// orgs.json file; swap this for a real GBrain HTTP client without touching the
// 5 call sites.

import { getOrg, updateOrg } from '../orgs';

export type GBrainMemoryKind = 'decision' | 'fact' | 'rule' | 'voice' | 'failed-attempt' | 'handoff-pin';

export interface GBrainPinInput {
  orgSlug: string;
  kind: GBrainMemoryKind;
  text: string;
}

export const GBRAIN_PROVIDER = 'gbrain' as const;

/** Pin a memory item for the org. Returns the updated memory list. */
export async function pinMemory(input: GBrainPinInput): Promise<{ orgSlug: string; count: number }> {
  const org = await getOrg(input.orgSlug);
  if (!org) throw new Error(`GBrain: org ${input.orgSlug} not found`);
  const memories = [
    ...(org.memories ?? []),
    { kind: input.kind, text: input.text.trim() },
  ].filter((m) => m.text.length > 0);
  await updateOrg(org.slug, { memories });
  return { orgSlug: org.slug, count: memories.length };
}

/** Cold-start memory read — what every new agent sees on join. */
export async function recallMemory(orgSlug: string): Promise<{ kind: string; text: string }[]> {
  const org = await getOrg(orgSlug);
  return org?.memories ?? [];
}
