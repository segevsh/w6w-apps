/**
 * Is Account Engagement up? — Salesforce Trust, product `MCAccountEngagement`.
 *
 * `status.salesforce.com` is a JS shell with no Statuspage/Atom feed, but Trust
 * publishes a Swagger-documented JSON API at `https://api.status.salesforce.com/v1/docs/`
 * (the spec itself is served at `/v1`). `GET /v1/products/{key}` is "Returns a product by
 * id" and, for `MCAccountEngagement` ("Marketing Cloud Account Engagement"), carries one
 * instance (`ACCOUNTENGAGEMENT`) with a `status` and its open `Incidents`.
 *
 *   - `kind: "service"`, `scope: "app"` — Account Engagement is ONE product here, not
 *     per-instance like core Salesforce, so every Connection shares the answer.
 *   - `credential: "none"` — Trust is a third-party host; `sign` must not run. Its host is
 *     added to THIS hook's `network.allow`, never to the app's.
 *   - The spec documents the `status` field but not its value set, so the vocabulary is the
 *     one the sibling `salesforce` app already maps; an unrecognised non-`OK` value reads as
 *     `degraded` rather than being waved through as healthy.
 *   - Trust API failure is `unknown`, never `down`: it says nothing about the product.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const STATUS_HOST = "api.status.salesforce.com";
const PRODUCT = "MCAccountEngagement";

const STATUS: Record<string, HealthState> = {
  OK: "ok",
  INFORMATIONAL: "ok",
  MINOR_INCIDENT_CORE: "degraded",
  MAJOR_INCIDENT_CORE: "down",
  MINOR_INCIDENT_NONCORE: "degraded",
  MAJOR_INCIDENT_NONCORE: "degraded",
  MAINTENANCE_CORE: "degraded",
  MAINTENANCE_NONCORE: "ok",
  UNPLANNED_MAINTENANCE_CORE: "down",
};

const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };

interface Product {
  key?: string;
  Instances?: Array<{ key?: string; status?: string }>;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Account Engagement status",
  description:
    "Salesforce Trust status for the Account Engagement product (api.status.salesforce.com/v1/products/MCAccountEngagement).",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/v1/products/${PRODUCT}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return { state: "unknown", message: `Trust returned ${res.status}` };

    const body = await res.json().catch(() => undefined) as Product | undefined;
    // A 200 is not enough: the answer must be the documented Product shape for OUR product.
    if (body?.key !== PRODUCT || !Array.isArray(body.Instances) || body.Instances.length === 0) {
      return { state: "unknown", message: "Trust returned no Account Engagement instance" };
    }

    let worst: HealthState = "ok";
    const components: Record<string, { state: HealthState }> = {};
    const notes: string[] = [];
    for (const inst of body.Instances) {
      const state = inst.status === undefined
        ? "unknown"
        : STATUS[inst.status] ?? (inst.status === "OK" ? "ok" : "degraded");
      components[(inst.key ?? "instance").toLowerCase()] = { state };
      notes.push(`${inst.key ?? "instance"}: ${inst.status ?? "no status"}`);
      if (RANK[state] > RANK[worst]) worst = state;
    }
    return { state: worst, message: notes.join("; "), components, ttlSeconds: 120 };
  },
};

export default service;
