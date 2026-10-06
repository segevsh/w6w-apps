/**
 * How many Runway credits are left?
 *
 * `GET /v1/organization` returns `creditBalance` and the usage tier's
 * `maxMonthlyCreditSpend`. It is read-only, free and carries no credential material. Signed,
 * on the app's own host; it is the same endpoint the Auth `test` probes.
 *
 * Credits have no period limit to compute a fraction from, so the verdict is absolute: no
 * credits left is `down` (generations are refused), a balance under a tenth of the tier's
 * monthly spend ceiling is `degraded`, otherwise `ok`.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_BASE, API_VERSION } from "../lib/client.ts";

export const ORG_URL = `${API_BASE}/v1/organization`;

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit headroom",
  description:
    "Credit balance vs the usage tier's monthly spend ceiling, from GET /v1/organization.",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(ORG_URL, {
      headers: { accept: "application/json", "x-runway-version": API_VERSION },
    });
    if (!res.ok) {
      return { state: "unknown", message: `GET /v1/organization answered HTTP ${res.status}` };
    }
    const body = await res.json().catch(() => null) as
      | { creditBalance?: number; tier?: { maxMonthlyCreditSpend?: number } }
      | null;
    const remaining = body?.creditBalance;
    if (typeof remaining !== "number") {
      return { state: "unknown", message: "GET /v1/organization carried no credit balance" };
    }
    const ceiling = body?.tier?.maxMonthlyCreditSpend ?? 0;
    const state: HealthState = remaining <= 0
      ? "down"
      : ceiling > 0 && remaining < ceiling / 10
      ? "degraded"
      : "ok";
    return {
      state,
      message: state === "ok"
        ? undefined
        : state === "down"
        ? "no credits left; generations will be refused"
        : `${remaining} credits left (tier ceiling ${ceiling} per month)`,
      quota: [{ id: "credits", remaining, unit: "credits" }],
      ttlSeconds: 300,
    };
  },
};

export default quota;
