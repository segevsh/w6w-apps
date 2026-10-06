/**
 * How many credits are left?
 *
 * Dropcontact sells credits per plan and publishes no total, so there is no limit to compare
 * against: only `credits_left`. It is read with the documented zero-cost call (`POST /all` with
 * one empty object, "without consuming any"), signed, on the app's own host. `down` at zero —
 * Dropcontact refuses further work once the quota is gone (documented 403 "Token exceeded
 * quota"). It is `informational`: plans may roll credits over or top up, so a low balance is
 * context for a human, not an outage.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, ENRICH_PATH, parseEnvelope } from "../lib/client.ts";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credits left",
  description: "Remaining credits from the documented zero-cost POST /v1/enrich/all.",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  severity: "informational",
  minIntervalSeconds: 600,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${ENRICH_PATH}`, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ data: [{}] }),
    });
    const body = parseEnvelope(await res.text().catch(() => ""));
    if (res.status === 403) {
      return {
        state: "down",
        message: `Dropcontact refused the call: ${body.reason ?? "token exceeded quota"}`,
        quota: [{ id: "credits", remaining: 0, unit: "credits" }],
        ttlSeconds: 600,
      };
    }
    if (!res.ok || typeof body.credits_left !== "number") {
      return { state: "unknown", message: `POST /v1/enrich/all answered HTTP ${res.status}` };
    }
    const left = body.credits_left;
    return {
      state: left <= 0 ? "down" : "ok",
      message: left <= 0 ? "no credits left" : undefined,
      quota: [{ id: "credits", remaining: Math.max(0, left), unit: "credits" }],
      ttlSeconds: 600,
    };
  },
};

export default quota;
