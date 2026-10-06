/**
 * Is e-conomic's REST API up? — Atlassian Statuspage at status.e-conomic.com.
 *
 * Verified 2026-10-06: `GET /api/v2/summary.json` answers Statuspage's schema with
 * `page.id` `834xxvq1gy9f` (`page.name` "e-conomic"), a top-level `status.indicator`, and 20
 * components including a dedicated **"REST API"** (`7v5vbfhgbs2x`, in the "API" group
 * `699m4x1lpl30` next to "OpenAPI").
 *
 * The page covers the WHOLE product — Web Application, Journals, Mobile Apps, payroll, payment
 * links, the AI assistant — so its top-level indicator would report this app down because, say,
 * Mobile Apps is. The verdict is therefore the REST API component alone, found by its stable id
 * (falling back to its name); every other component is reported as detail, never as the verdict.
 * A page whose id is not the pinned one, or that has no REST API component, is `unknown`.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const STATUS_HOST = "status.e-conomic.com";
const PAGE_ID = "834xxvq1gy9f";
const REST_API_COMPONENT_ID = "7v5vbfhgbs2x";

const COMPONENT: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "e-conomic REST API status",
  description:
    "Atlassian Statuspage component 'REST API' at status.e-conomic.com. Unauthenticated and unsigned; the page's whole-product indicator is deliberately ignored.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing about the API.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      page?: { id?: string };
      components?: Array<{ id?: string; name?: string; status?: string; group?: boolean }>;
    };
    if (body.page?.id !== PAGE_ID) {
      return { state: "unknown", message: "status page is not the expected e-conomic page" };
    }

    const components: Record<string, { state: HealthState }> = {};
    let rest: HealthState | undefined;
    for (const c of body.components ?? []) {
      if (!c.name || c.group) continue;
      const state = COMPONENT[c.status ?? ""] ?? "unknown";
      components[slug(c.name)] = { state };
      if (c.id === REST_API_COMPONENT_ID || (rest === undefined && c.name === "REST API")) {
        rest = state;
      }
    }
    if (rest === undefined) {
      return { state: "unknown", message: "no 'REST API' component on the status page" };
    }
    return {
      state: rest,
      message: rest === "ok" ? "REST API operational" : "REST API reports an incident",
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
