import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, PATHS } from "../lib/client.ts";

/**
 * How many credits does this account have left?
 *
 * Reads `GET /v2/credits/balance/` — the same endpoint `auth/api-key.ts`
 * probes for liveness, and for the same reason: it is documented with no
 * "Pricing" row (unlike every metered endpoint in this app), so running it on
 * a health-check cadence costs nothing.
 *
 * Wappalyzer's response is `{"credits": <integer>}` — a raw balance, with no
 * ceiling or reset date exposed anywhere in the documented API. So unlike
 * Apify's plan-limits check (which reports a `limit`/`remaining` pair per
 * dimension), this reports only `remaining`: there is no vendor-stated `limit`
 * to divide by, and inventing one — e.g. treating the first-seen balance as
 * "the ceiling" — would silently misreport every account whose plan is a
 * different size.
 *
 * `credits <= 0` is reported `down` rather than `degraded`: every metered
 * endpoint in this app (lookup, subdomains, verify, list finalization) is
 * refused outright once the balance is exhausted, per the vendor's own 403
 * documentation ("insufficient credits").
 */
export const CREDITS_BALANCE_URL = `${API_BASE}${API_PREFIX}${PATHS.creditsBalance}`;

interface CreditsBalanceBody {
  credits?: number;
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit balance",
  description:
    "Remaining credit balance, read from the free GET /v2/credits/balance/ endpoint — no " +
    "vendor-stated ceiling exists, so only the remaining count is reported.",
  kind: "quota",
  covers: ["*"],
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(CREDITS_BALANCE_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return {
        state: "unknown",
        message: `Wappalyzer returned ${res.status} for the credit-balance read`,
      };
    }

    const body = await res.json().catch(() => null) as CreditsBalanceBody | null;
    if (typeof body?.credits !== "number") {
      return {
        state: "unknown",
        message: "Credit-balance response carried no numeric credits field",
      };
    }

    const remaining = body.credits;
    return {
      state: remaining <= 0 ? "down" : "ok",
      message: remaining <= 0
        ? "Out of credits — every metered call (lookup, subdomains, verify, list finalization) " +
          "will be refused until the balance is topped up"
        : undefined,
      quota: [{ id: "credits", remaining, unit: "credits" }],
      ttlSeconds: 300,
    };
  },
};

export default quota;
