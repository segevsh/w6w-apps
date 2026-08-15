/**
 * Is CallRail up?
 *
 * ## The status page is real. Checked three ways on 2026-08-15
 *
 * CallRail publishes at **`status.callrail.com`**, an Atlassian Statuspage.
 *
 * **(a) Content-type AND body.** `GET /api/v2/summary.json` answered `200`,
 * `application/json`, 13,596 bytes, parsing as the Statuspage v2 schema. That
 * is far from either known unclaimed-host signature (~127,700 B of HTML for
 * an unclaimed `*.statuspage.io`, ~216,800 B for an unclaimed
 * `*.instatus.com`).
 *
 * **(b) Does the page describe THIS product?** Yes:
 *
 *     "page": { "id": "clbfknnjdfpl", "name": "CallRail",
 *               "url": "https://status.callrail.com" }
 *
 * **(c) Does it carry a component that covers the API, not just the
 * product?** Yes — among its 35 components is one literally named `API`
 * (verified live, 2026-08-15), alongside `SMS`, `MMS`, `Call Tracking`, `Call
 * Routing`, `Webhooks`, `Call Recording` and `Call Transcription`. A page
 * whose components were all product-level (dashboards, mobile apps) would not
 * be a statement about the API this app calls; this one names the API
 * directly.
 *
 * ## Two findings that shape the code below
 *
 * **Not every component is CallRail's own.** The reference doesn't say so,
 * but the live page groups some entries under container rows (`group: true`,
 * e.g. "Lead Center", "Integrations") whose children include third-party
 * dependents like `Hubspot`. Container rows are filtered out below — reporting
 * them would double-count every child underneath.
 *
 * **The page-level indicator is the verdict, components are the detail.**
 * `status.indicator` is CallRail's own roll-up, and it is the field to trust;
 * deriving a verdict purely from the component list would report CallRail
 * down because one minor integration is degraded.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. CallRail is SaaS-only
 * — there is no self-hosted CallRail — so an incident here is evidence about
 * every Connection this app can hold.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below
 * — a status host must never see a CallRail API key.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.callrail.com/api/v2/summary.json";

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

/**
 * Statuspage's documented component vocabulary: `operational`,
 * `degraded_performance`, `partial_outage`, `major_outage`,
 * `under_maintenance`.
 */
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

/**
 * Key a component by the vendor's id, falling back to a slug of the name.
 *
 * The id is stable across renames and is what the page's own incident records
 * reference. The fallback exists only so a future page that drops ids still
 * reports something rather than silently dropping rows.
 */
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
  title: "CallRail platform status",
  description: "Component status from status.callrail.com. Covers the API, Call Tracking, " +
    "SMS, MMS, Call Routing, Webhooks, Call Recording and Call Transcription, plus the rest " +
    "of CallRail's own product surface.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.callrail.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about CallRail — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe
    // at someone else's page.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.callrail\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as CallRail's" };
    }

    // `group: true` rows are containers whose status merely mirrors their
    // children; reporting them would double-count whatever sits underneath.
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
