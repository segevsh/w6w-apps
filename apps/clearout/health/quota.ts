/**
 * How many Clearout credits are left?
 *
 * `GET /account/credits` returns `total_remaining_credits` and
 * `low_credit_balance_min_threshold` (the account's own low-balance alert level). It is
 * read-only, free and carries no credential material. Signed, on the app's own host; it
 * is the same endpoint the Auth `test` probes.
 *
 * Credits have no period limit to compute a fraction from, so the verdict is absolute:
 * none left is `down` (every metered call fails with 402/1002), at or under the
 * account's own threshold is `degraded`, otherwise `ok`. A zero threshold means "no
 * alert configured", not "alert at zero".
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

export const CREDITS_URL = `${API_BASE}/account/credits`;

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit headroom",
  description:
    "Remaining credits vs the account's low-balance threshold, from GET /account/credits.",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(CREDITS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `GET /account/credits answered HTTP ${res.status}` };
    }
    const body = await res.json().catch(() => null) as
      | { data?: { total_remaining_credits?: number; low_credit_balance_min_threshold?: number } }
      | null;
    const remaining = body?.data?.total_remaining_credits;
    if (typeof remaining !== "number") {
      return { state: "unknown", message: "GET /account/credits carried no credit figure" };
    }
    const threshold = body?.data?.low_credit_balance_min_threshold ?? 0;
    const state: HealthState = remaining <= 0
      ? "down"
      : threshold > 0 && remaining <= threshold
      ? "degraded"
      : "ok";
    return {
      state,
      message: state === "ok"
        ? undefined
        : state === "down"
        ? "no credits left; metered calls will fail with 402"
        : `${remaining} credits left (alert threshold ${threshold})`,
      quota: [{ id: "credits", remaining, unit: "credits" }],
      ttlSeconds: 300,
    };
  },
};

export default quota;
