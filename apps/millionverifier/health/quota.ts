/**
 * How many MillionVerifier credits are left?
 *
 * `GET /api/v3/credits` returns `credits` (remaining), `bulk_credits` (the same figure),
 * `renewing_credits` and `plan`. Read-only, free, no credential material in the body.
 * Signed, on the app's own host; the same endpoint the Auth `test` probes. The vendor
 * exposes no alert threshold or period limit, so the verdict is absolute: none left is
 * `down` (verification and bulk uploads fail), otherwise `ok`. A vendor `error` body (HTTP
 * 200) is `unknown`, never a verdict on the credit balance.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { SINGLE_HOST } from "../lib/client.ts";

export const CREDITS_URL = `https://${SINGLE_HOST}/api/v3/credits`;

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit headroom",
  description: "Remaining credits from GET /api/v3/credits; down at zero.",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(CREDITS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `GET /api/v3/credits answered HTTP ${res.status}` };
    }
    const body = await res.json().catch(() => null) as
      | { credits?: number; error?: string }
      | null;
    const remaining = body?.credits;
    if (typeof remaining !== "number") {
      return {
        state: "unknown",
        message: body?.error
          ? `GET /api/v3/credits answered an error: ${body.error}`
          : "GET /api/v3/credits carried no credit figure",
      };
    }
    return {
      state: remaining <= 0 ? "down" : "ok",
      message: remaining <= 0 ? "no credits left; verification will fail" : undefined,
      quota: [{ id: "credits", remaining, unit: "credits" }],
      ttlSeconds: 300,
    };
  },
};

export default quota;
