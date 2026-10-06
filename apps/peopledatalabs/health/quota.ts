/**
 * Credit headroom on THIS account. PDL puts the account's remaining credits on the response
 * headers of every call, and a call with no parameters is rejected as a bad request without
 * spending anything, so `GET /v5/person/enrich` with no inputs is a free read of
 * `x-totallimit-remaining` (purchased plus overage credits left; usage-limits doc). Zero means
 * every billable call will answer 402, so it is `degraded`. Informational: an empty balance is a
 * billing matter, not an outage. An account whose headers omit the field reports `unknown`.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit balance",
  description:
    "Credits left, read from the `x-totallimit-remaining` header of a parameterless (free) GET /v5/person/enrich. `degraded` at 0.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/v5/person/enrich`, {
      headers: { accept: "application/json" },
    });
    if (res.status === 401) {
      return { state: "unknown", message: "credential rejected; see the auth check" };
    }
    const raw = res.headers.get("x-totallimit-remaining");
    const remaining = raw === null || raw.trim() === "" ? NaN : Number(raw);
    if (!Number.isFinite(remaining)) {
      return {
        state: "unknown",
        message: `no x-totallimit-remaining header on the ${res.status} response`,
      };
    }
    return {
      state: remaining <= 0 ? "degraded" : "ok",
      message: remaining <= 0 ? "credits exhausted; billable calls will answer 402" : undefined,
      quota: [{ id: "credits", remaining, unit: "credits" }],
      ttlSeconds: 300,
    };
  },
};

export default quota;
