/**
 * Trigger coverage of the w6w app pack — pure counting helpers used by `audit.ts`.
 *
 * A trigger is a poll trigger iff it carries a `poll` function (the loader's derived
 * `type` is not present on the live default export); anything else is a webhook
 * trigger (webhook or plain receiver).
 */

export interface TriggerCounts {
  webhook: number;
  poll: number;
}

export interface TriggerSummary {
  /** Apps with at least one trigger. */
  apps: number;
  webhookApps: number;
  pollApps: number;
  bothApps: number;
}

// deno-lint-ignore no-explicit-any
export function countTriggers(def: any): TriggerCounts {
  const counts: TriggerCounts = { webhook: 0, poll: 0 };
  const triggers = def?.triggers;
  if (!Array.isArray(triggers)) return counts;
  for (const t of triggers) {
    if (t && typeof t.poll === "function") counts.poll++;
    else counts.webhook++;
  }
  return counts;
}

export function summarize(map: Record<string, TriggerCounts>): TriggerSummary {
  const s: TriggerSummary = {
    apps: 0,
    webhookApps: 0,
    pollApps: 0,
    bothApps: 0,
  };
  for (const c of Object.values(map)) {
    if (c.webhook + c.poll === 0) continue;
    s.apps++;
    if (c.webhook > 0) s.webhookApps++;
    if (c.poll > 0) s.pollApps++;
    if (c.webhook > 0 && c.poll > 0) s.bothApps++;
  }
  return s;
}

export function formatLine(s: TriggerSummary): string {
  return `Triggers: ${s.apps} apps (${s.webhookApps} webhook, ${s.pollApps} poll)`;
}
