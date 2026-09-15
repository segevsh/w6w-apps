/**
 * Is Float up?
 *
 * ## The status page is real. Checked three ways on 2026-09-15
 *
 * Float publishes at **`status.float.com`**, an Atlassian Statuspage.
 *
 * **(a) Bogus sibling path — is this a catch-all?** No.
 *
 *   | Path                                   | Status  | Bytes |
 *   | --------------------------------------- | ------- | ----- |
 *   | `/api/v2/summary.json`                  | 200     | 1,654 |
 *   | `/api/v2/status.json`                   | 200     | 210   |
 *   | `/api/v2/definitely-not-real-zzz.json`  | **404** | **0** |
 *
 * The nonsense path is refused outright rather than answering a page shell.
 *
 * **(b) Content-type AND body.** `application/json; charset=UTF-8`, parsing
 * as the Statuspage v2 schema — far too small (1,654 B) to be either known
 * unclaimed-host decoy shape (~127,700 B for `*.statuspage.io`, ~216,800 B
 * for `*.instatus.com`).
 *
 * **(c) Does the page describe THIS product?** Yes:
 *
 *     "page": { "id": "cf8c8l00p2r5", "name": "Float",
 *               "url": "https://status.float.com" }
 *
 * and its four components are Float's own: `Float App`, `API - public`
 * ("Float public API"), `www.float.com` ("Float marketing site") and
 * `Float Payments & Subscriptions`.
 *
 * ## Only one component is this App's surface, and it is named exactly
 *
 * `API - public` (id `rflwrc6jxg1r`) is the one this app's every action and
 * the `quota` check depend on. The other three (main app, marketing site,
 * billing) are reported for completeness but do not gate this app's own
 * verdict any harder than the page-level indicator already does — Float has
 * no component grouping to navigate around, unlike Apify's 29-component page.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Float is SaaS-only —
 * there is no self-hosted Float — so an incident here is evidence about
 * every Connection this app can hold.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly: it is the precondition for the `network` widening below — a
 * status host must never see a Float API token.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.float.com/api/v2/summary.json";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
  group_id?: string | null;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatusComponent[];
  incidents?: Array<{ name?: string; status?: string }>;
  scheduled_maintenances?: unknown[];
  status?: { indicator?: string; description?: string };
}

/** Statuspage's documented component vocabulary. */
export function mapComponentStatus(status: string | undefined): HealthState {
  switch (status) {
    case "operational":
      return "ok";
    case "degraded_performance":
    case "partial_outage":
    case "under_maintenance":
      return "degraded";
    case "major_outage":
      return "down";
    default:
      return "unknown";
  }
}

/** The page-level roll-up: `none`, `minor`, `major`, `critical`, `maintenance`. */
export function mapIndicator(indicator: string | undefined): HealthState {
  switch (indicator) {
    case "none":
      return "ok";
    case "minor":
    case "major":
    case "maintenance":
      return "degraded";
    case "critical":
      return "down";
    default:
      return "unknown";
  }
}

/** Key a component by the vendor's id, falling back to a slug of the name. */
export function componentKey(component: StatusComponent, index: number): string {
  if (component.id) return component.id;
  if (component.name) {
    return `${
      component.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    }-${index}`;
  }
  return `component-${index}`;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Float platform status",
  description:
    "Component status from status.float.com: Float App, API - public, www.float.com and " +
    "Float Payments & Subscriptions.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.float.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Float — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect silently pointing this probe at
    // someone else's page.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.float\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Float's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, index) => {
      const state = mapComponentStatus(node.status);
      components[componentKey(node, index)] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    });

    const indicator = body.status?.indicator;
    const state = indicator === undefined
      ? worstHealthState(Object.values(components).map((c) => c.state))
      : mapIndicator(indicator);

    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    const openIncidents = body.incidents?.length ?? 0;
    const maintenance = body.scheduled_maintenances?.length ?? 0;

    const notes: string[] = [];
    if (body.status?.description) notes.push(body.status.description);
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s)`);
    if (maintenance > 0) notes.push(`${maintenance} scheduled maintenance window(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
