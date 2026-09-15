/**
 * Is AddEvent up?
 *
 * ## The status page is real, checked three ways on 2026-09-15
 *
 * AddEvent publishes at **`addevent.statuspage.io`**, an Atlassian Statuspage instance.
 *
 * **(a) Not an unclaimed catch-all.** `GET /api/v2/summary.json` answers `200` with
 * 1.3 KB of Statuspage-v2 JSON, `content-type: application/json`. An unclaimed
 * `*.statuspage.io` host instead serves ~127,700 bytes of decoy HTML — measured
 * distinct, different byte count and content type entirely.
 *
 * **(b) A sibling host that IS the unclaimed decoy exists right next to it**, which is
 * exactly the trap worth naming: `addevent.instatus.com` also answers `200`, but its
 * title is the generic "Instatus – Get ready for downtime" placeholder every unclaimed
 * Instatus page carries. It is not used here.
 *
 * **(c) Does the page describe THIS product?** Yes — `page.name` is `"AddEvent"`, and
 * its four components are AddEvent's own product surfaces: `AddEvent Dashboard`,
 * `AddEvent Website`, `AddEvent API`, `AddEvent Landing Pages`.
 *
 * ## Why a hand-rolled `check()` instead of `feed`
 *
 * `summary.json` already states each component's CURRENT status directly — there is no
 * need to fold an update log into "current state per incident" the way a `feed`
 * (Atom/RSS) would require; the doc's own guidance to prefer `feed` applies to a vendor
 * that publishes only a log, which AddEvent does not.
 *
 * `credential: "none"` is the default for `kind: "service"`, stated explicitly because
 * it is the precondition for widening `network.allow` to the status host below — a
 * status page must never see an AddEvent API key.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://addevent.statuspage.io/api/v2/summary.json";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
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
  title: "AddEvent platform status",
  description: "Component status from addevent.statuspage.io: dashboard, website, API and " +
    "landing pages.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["addevent.statuspage.io"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about AddEvent — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a redirect/rebrand silently pointing this probe at someone else's
    // page — addevent.instatus.com is a live example of an unclaimed sibling right
    // next door.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)addevent\.statuspage\.io(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as AddEvent's" };
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
      state: mapIndicator(indicator),
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
