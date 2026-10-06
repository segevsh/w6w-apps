/**
 * Credit headroom on THIS account. Findymail publishes no rate-limit headers (the docs state only
 * a concurrent-request cap of 300), but `GET /api/credits` is free and returns the two balances
 * `{ credits, verifier_credits }` — finder credits spend on finds, verifier credits on
 * verification. There is no plan limit in the response, so no ratio is invented: a balance of 0 is
 * `degraded` (lookups will answer 402), anything else `ok`. Informational: an empty balance is
 * a billing matter, not an outage.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit balance",
  description:
    "Finder and verifier credits left, read from the free `GET /api/credits`. `degraded` when either balance is 0.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/api/credits`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return { state: "unknown", message: `credits probe returned ${res.status}` };
    const body = await res.json().catch(() => null) as
      | { credits?: unknown; verifier_credits?: unknown }
      | null;
    const finder = body?.credits;
    const verifier = body?.verifier_credits;
    if (typeof finder !== "number" || typeof verifier !== "number") {
      return { state: "unknown", message: "credits response carried no numeric balances" };
    }
    const empty = [finder <= 0 ? "finder" : "", verifier <= 0 ? "verifier" : ""].filter(Boolean);
    return {
      state: empty.length > 0 ? "degraded" : "ok",
      message: empty.length > 0 ? `${empty.join(" and ")} credits exhausted` : undefined,
      quota: [
        { id: "finder-credits", remaining: finder, unit: "credits" },
        { id: "verifier-credits", remaining: verifier, unit: "credits" },
      ],
      ttlSeconds: 300,
    };
  },
};

export default quota;
