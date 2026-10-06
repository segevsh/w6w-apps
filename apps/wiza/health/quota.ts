/**
 * Credit headroom, from `GET /api/meta/credits` (a signed call; reading the balance is not
 * documented as charging anything).
 *
 * Wiza meters four pools — email, phone, export and API credits — and the API bills against
 * `api_credits` (a number). Email and phone credits can be the STRING `"unlimited"`, so only
 * `api_credits` is read as a bucket and the others are ignored. 0 is down (every billed call
 * then returns a 200 whose record is `failed` / `billing_issue`), under 10 is degraded.
 * `informational`: running low is context for a person, not a verdict on the vendor.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

export function headroom(remaining: number): HealthState {
  if (remaining <= 0) return "down";
  if (remaining < 10) return "degraded";
  return "ok";
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API credit balance",
  description: "Remaining API credits from a signed GET /api/meta/credits.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 900,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/api/meta/credits`, {
      headers: { accept: "application/json" },
    });
    if (res.status === 429) return { state: "degraded", message: "rate limited" };
    const body = await res.json().catch(() => null) as
      | { credits?: { api_credits?: unknown } }
      | null;
    const remaining = body?.credits?.api_credits;
    if (typeof remaining !== "number") {
      return { state: "unknown", message: `credit probe returned ${res.status} without a balance` };
    }
    const bucket: HealthQuota = { id: "api_credits", remaining, unit: "credits" };
    return { state: headroom(remaining), quota: [bucket], ttlSeconds: 300 };
  },
};

export default quota;
