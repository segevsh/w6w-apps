import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * How many credits are left?
 *
 * `GET /v1/credits` answers `{planCredits, anytimeCredits, totalCredits}` — a real balance. Each
 * text spends credits and sending is refused at zero, so the check reports `down` only when
 * `totalCredits` is 0 and `ok` otherwise; a made-up low-water mark would be a guess about
 * spending habits. The balance is reported as a quota reading. (The documented 200 requests per
 * minute rate limit is not readable ahead of time: it is only signalled by a 429.)
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit balance",
  description:
    "The account's remaining credits (plan + anytime), read from GET /v1/credits. Sending stops " +
    "at zero rather than slowing down, so this reports exhausted vs. not.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/credits`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      await res.body?.cancel();
      return { state: "unknown", message: `EZ Texting returned ${res.status} for GET /v1/credits` };
    }
    const body = await res.json().catch(() => null) as { totalCredits?: number } | null;
    if (!body || typeof body.totalCredits !== "number") {
      return { state: "unknown", message: "GET /v1/credits carried no numeric totalCredits" };
    }
    const quotaReading = [{ id: "credits", remaining: body.totalCredits, unit: "credits" }];
    if (body.totalCredits <= 0) {
      return {
        state: "down",
        message: "no credits left — sending will be refused, not slowed",
        quota: quotaReading,
      };
    }
    return {
      state: "ok",
      message: `${body.totalCredits} credits remaining`,
      quota: quotaReading,
      ttlSeconds: 300,
    };
  },
};

export default quota;
