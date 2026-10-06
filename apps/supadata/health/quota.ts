/**
 * How many credits are left this billing period?
 *
 * Probe: `GET /v1/me` → `{ organizationId, plan, maxCredits, usedCredits }`. It costs nothing and is
 * exempt from the rate limit (vendor rate-limit docs), and the document holds no credential, so
 * signing the probe leaks nothing. `kind: "quota"`, `signed` (the default), no `network.allow` of
 * its own.
 *
 * `severity: "informational"` — running low is worth showing, never worth failing a verdict over.
 * The state is `degraded` once 90% of credits are used and `down` at 100%, because past that every
 * billable call is refused with 429/402; those thresholds are this app's, the vendor documents none.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit allowance",
  description: "Credits used against the plan's allowance for the current billing period.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/me`, { headers: { accept: "application/json" } });
    if (!res.ok) {
      await res.body?.cancel();
      return { state: "unknown", message: `credit probe returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as
      | { plan?: string; maxCredits?: number; usedCredits?: number }
      | null;
    const max = body?.maxCredits;
    const used = body?.usedCredits;
    if (typeof max !== "number" || typeof used !== "number") {
      return { state: "unknown", message: "response carried no credit counters" };
    }
    const remaining = Math.max(0, max - used);
    const quotaEntry = { id: "credits", limit: max, remaining, unit: "credits" };
    const message = `${used} of ${max} credits used${body?.plan ? ` (${body.plan} plan)` : ""}`;
    if (max > 0 && used >= max) return { state: "down", message, quota: [quotaEntry] };
    if (max > 0 && used / max >= 0.9) return { state: "degraded", message, quota: [quotaEntry] };
    return { state: "ok", message, quota: [quotaEntry], ttlSeconds: 300 };
  },
};

export default quota;
