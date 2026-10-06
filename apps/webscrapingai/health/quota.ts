/**
 * How many credits are left?
 *
 * Probe: `GET /account` → `{ email, remaining_monthly_credits, remaining_payg_credits,
 * remaining_total_credits, resets_at, remaining_concurrency }`. The body holds the account email
 * but no credential, so signing the probe leaks nothing. `kind: "quota"`, signed (the default), no
 * `network.allow` of its own.
 *
 * The vendor reports what is LEFT, not the plan size, so no `limit` is claimed. `down` at zero
 * total credits (every billable call is refused with 402); otherwise `ok`.
 * `severity: "informational"` — running dry is worth showing, never worth failing a verdict over.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit allowance",
  description: "Remaining API credits (monthly plus pay-as-you-go) on the account.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/account`, { headers: { accept: "application/json" } });
    if (!res.ok) {
      await res.body?.cancel();
      return { state: "unknown", message: `credit probe returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as
      | { remaining_total_credits?: number; resets_at?: number }
      | null;
    const left = body?.remaining_total_credits;
    if (typeof left !== "number") {
      return { state: "unknown", message: "response carried no credit counters" };
    }
    const entry = {
      id: "credits",
      remaining: left,
      unit: "credits",
      ...(typeof body?.resets_at === "number"
        ? { resetAt: new Date(body.resets_at * 1000).toISOString() }
        : {}),
    };
    const message = `${left} credits remaining`;
    if (left <= 0) return { state: "down", message, quota: [entry] };
    return { state: "ok", message, quota: [entry], ttlSeconds: 300 };
  },
};

export default quota;
