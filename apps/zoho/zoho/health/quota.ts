/**
 * How much daily API credit headroom is left on THIS connection — Zoho CRM.
 *
 * Annotation:
 *
 *   - `kind: "quota"`. The derived `auth:oauth2` check already answers "is the
 *     credential live"; this answers "will the next hundred calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's
 *     defaults and both are correct: the allowance belongs to the org behind
 *     the credential, and reading it needs the credential on the wire.
 *     Signing is safe because `/org` stays on the app's own egress allowlist
 *     (`www.zohoapis.com`) — this check declares no `network.allow` of its
 *     own, which the spec forbids alongside a signed posture.
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over.
 *
 * Probe: `GET /crm/v6/org` — the cheapest authenticated call this app knows
 * (needs only `ZohoCRM.org.READ`, the same scope the `oauth2` auth method's
 * `test` hook probes). Zoho does not expose remaining daily credits on every
 * response the way HubSpot or Salesforce do: the `X-API-CREDITS-REMAINING`
 * header only appears once usage crosses 50% of the org's daily allowance —
 * below that threshold Zoho omits it entirely, so its *absence* is itself
 * informative (plenty of headroom) rather than "unknown".
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_VERSION, apiDomainFromConnection } from "../lib/client.ts";

const headroom = (remaining: number): HealthState => {
  if (remaining <= 0) return "down";
  if (remaining < 1000) return "degraded";
  return "ok";
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Daily API credit headroom",
  description:
    "Reads `X-API-CREDITS-REMAINING` off `GET /crm/v6/org`. Zoho only sends this header once usage crosses 50% of the day's credit allowance.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const domain = apiDomainFromConnection(ctx.connection);
    const res = await ctx.fetch(`${domain}/crm/${API_VERSION}/org`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const header = res.headers.get("x-api-credits-remaining");
    if (header === null) {
      return {
        state: "ok",
        message:
          "below 50% of the daily API credit allowance used (Zoho reports remaining credits only above that threshold)",
        ttlSeconds: 300,
      };
    }

    const remaining = Number(header);
    if (!Number.isFinite(remaining)) {
      return { state: "unknown", message: `unparseable X-API-CREDITS-REMAINING: "${header}"` };
    }
    return {
      state: headroom(remaining),
      quota: [{ id: "daily-credits", remaining, unit: "credits" }],
      ttlSeconds: 300,
    };
  },
};

export default quota;
