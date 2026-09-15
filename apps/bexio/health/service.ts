/**
 * Is bexio up?
 *
 * ## The status page is real — verified 2026-09-15
 *
 * bexio publishes at **`www.bexio-status.com`**, an Atlassian Statuspage
 * (`server: AtlassianEdge` on the response headers). Its
 * `/api/v2/summary.json` answers 200 with 4,252 bytes of genuine JSON — well
 * under the ~127,700-byte HTML an *unclaimed* `*.statuspage.io` page serves at
 * that same path — and self-identifies as `page.name: "bexio AG"`,
 * `page.url: "https://www.bexio-status.com"`. Components include
 * `bexio Website`, `bexio Office`, `PostFinance` and a `Banking interfaces`
 * group (bLink, PostFinance, …) — bexio's own infrastructure plus the banking
 * integrations it depends on, not a generic template's placeholder rows.
 *
 * ## Two findings that shape the code below
 *
 * **The `Banking interfaces` group is a container.** Its four children
 * (`bLink`, `PostFinance`, and two more) report individually; the group row's
 * own `status` just mirrors the worst child, so counting both would
 * double-report the same incident.
 *
 * **The page-level indicator is the verdict.** `status.indicator` is bexio's
 * own roll-up, and it is what a caller should trust — deriving a verdict from
 * the component list instead risks reporting bexio down over a single minor
 * banking-interface hiccup that the page itself doesn't consider degraded.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for widening `network` below — a
 * status host must never see a bexio access token.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://www.bexio-status.com/api/v2/summary.json";

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
 * The id is stable across renames and is what the page's own incident
 * records reference. The fallback exists only so a page that drops ids still
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
  title: "bexio platform status",
  description:
    "Component status from bexio's Atlassian Statuspage (www.bexio-status.com). Covers the " +
    "bexio Website and Office apps plus the banking interfaces (PostFinance, bLink) bexio " +
    "itself depends on for reconciliation.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["www.bexio-status.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about bexio itself — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect silently pointing this probe at
    // someone else's page — a healthy, claimed status page that isn't
    // bexio's own.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)bexio-status\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as bexio's" };
    }

    // `group: true` rows are containers whose status merely mirrors their
    // children; reporting them too would double-count the banking group.
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
