/**
 * Credit headroom. FullEnrich publishes no rate-limit headers (the limit is a
 * flat 60 calls/minute), but `GET /account/credits` returns the credits this key
 * can still spend — the quota that actually runs out. A signed read; the body is
 * `{ balance }`, never the key. Zero credits means every enrichment ends
 * `CREDITS_INSUFFICIENT`, so that is `degraded` rather than `down`: lookups of
 * already-enriched contacts and every non-billed call still work.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit balance",
  description: "Credits this API key can still spend, from a signed `GET /account/credits`.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/account/credits`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return { state: "unknown", message: `credits probe returned ${res.status}` };
    const body = await res.json().catch(() => null) as { balance?: unknown } | null;
    const balance = body?.balance;
    if (typeof balance !== "number") {
      return { state: "unknown", message: "credits response carried no numeric balance" };
    }
    return {
      state: balance <= 0 ? "degraded" : "ok",
      message: balance <= 0 ? "no credits left" : undefined,
      quota: [{ id: "credits", remaining: balance, unit: "credits" }],
      ttlSeconds: 300,
    };
  },
};

export default quota;
