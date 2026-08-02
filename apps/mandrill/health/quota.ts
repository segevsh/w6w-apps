/**
 * How much sending headroom is left on THIS credential — Mandrill.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived `auth:*`
 *     check answers "is the credential live"; this answers "will the next
 *     hundred sends succeed without being queued".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's defaults
 *     and both are correct: the allowance belongs to the credential, and reading
 *     it needs the credential on the wire. Signing is safe because the probe
 *     stays on the app's own egress allowlist — this check declares no
 *     `network.allow` of its own, which the spec forbids alongside a signed
 *     posture. `ctx.fetch` is routed through the auth `sign` hook exactly like
 *     an action call, so the JSON body posted here (`{}`) arrives at Mandrill
 *     with `key` already merged in — this check never touches the credential
 *     directly.
 *   - `severity: "informational"` — running low is worth showing and never worth
 *     failing a verdict over.
 *
 * Probe: `POST /users/info.json`, the same account-info call every account
 * dashboard uses. Unlike most REST APIs in this pack, Mandrill exposes no
 * `X-RateLimit-*` response headers and no "remaining calls" figure at all —
 * verified against the official Python client's generated docstring
 * (`mandrill-api-python-3.7/mandrill.py`, `Users.info`, fetched 2026-08-02),
 * which is the most complete field-level reference available for this API.
 * What it DOES expose, verbatim from that docstring:
 *
 *   - `hourly_quota` (integer): "the maximum number of emails Mandrill will
 *     deliver for this user each hour. Any emails beyond that will be
 *     accepted and queued for later delivery. Users with higher reputations
 *     will have higher hourly quotas"
 *   - `backlog` (integer): "the number of emails that are queued for delivery
 *     due to exceeding your monthly or hourly quotas"
 *
 * `backlog > 0` is Mandrill's own, real signal that the account is currently
 * over quota and queuing mail — a direct, vendor-defined answer to "is there
 * headroom left before throttling", even though it is not shaped like a
 * classic limit/remaining pair. We report it as such rather than fabricate a
 * `remaining` count the vendor does not provide.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_URL, type MandrillErrorBody } from "../lib/client.ts";

interface UserInfo {
  hourly_quota?: number;
  backlog?: number;
  reputation?: number;
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Hourly sending quota headroom",
  description:
    "Reads `hourly_quota` and `backlog` off POST /users/info.json. A nonzero backlog means " +
    "Mandrill is currently queuing mail because the account is over its hourly or monthly quota.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/users/info.json`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null) as MandrillErrorBody | null;
      return { state: "unknown", message: body?.message ?? `quota probe returned ${res.status}` };
    }

    const body = await res.json().catch(() => ({})) as UserInfo;
    if (body.hourly_quota === undefined) {
      return { state: "unknown", message: "response carried no hourly_quota field" };
    }

    const backlog = body.backlog ?? 0;
    const state: HealthState = backlog <= 0
      ? "ok"
      : backlog >= body.hourly_quota
      ? "down"
      : "degraded";

    return {
      state,
      message: backlog > 0
        ? `${backlog} message(s) queued — account is over its hourly/monthly quota`
        : undefined,
      quota: [{
        id: "hourly",
        limit: body.hourly_quota,
        remaining: backlog > 0 ? 0 : undefined,
        unit: "emails/hour",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
