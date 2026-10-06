/**
 * Is the Printful API up? — Atlassian Statuspage at `www.printfulstatus.com`.
 *
 * Verified 2026-10-06: `status.printful.com` does not resolve, `www.printfulstatus.com` is the
 * real page (`page.name` "Printful", linked from printful.com) and serves Statuspage's
 * `/api/v2/summary.json`. The page rolls up 40 components — Shopify, Etsy, eBay and a dozen other
 * store integrations, the mobile apps, six fulfillment centres — so the top-level `indicator` is
 * NOT a statement about the API (an Etsy outage would read as Printful down). This check reads
 * only the dedicated `API` component (id `4jrgcd93007y`, in the "Printful.com" group), pinned by
 * id so a rename cannot silently re-point it, and reports "Developer Portal" as detail.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const STATUS_HOST = "www.printfulstatus.com";
const API_COMPONENT_ID = "4jrgcd93007y";
const PORTAL_COMPONENT_ID = "xs2dkww6r6tj";

const COMPONENT: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

const service: HealthCheckDefinition = {
  key: "service",
  title: "Printful API status",
  description: "The `API` component of Printful's Statuspage (www.printfulstatus.com). " +
    "Unauthenticated and unsigned; the page's integration and fulfillment components are ignored.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a failing status page says nothing about the vendor.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      components?: Array<{ id?: string; name?: string; status?: string }>;
    };
    const api = body.components?.find((c) => c.id === API_COMPONENT_ID);
    if (!api) {
      return { state: "unknown", message: "the status page has no API component (id changed?)" };
    }
    const portal = body.components?.find((c) => c.id === PORTAL_COMPONENT_ID);
    const components: Record<string, { state: HealthState }> = {
      api: { state: COMPONENT[api.status ?? ""] ?? "unknown" },
    };
    if (portal) {
      components["developer-portal"] = { state: COMPONENT[portal.status ?? ""] ?? "unknown" };
    }

    return {
      state: components.api.state,
      message: `API component: ${api.status}`,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
