import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

/**
 * Is Streamtime itself up?
 *
 * `https://streamtime.statuspage.io/api/v2/summary.json` — verified live on
 * 2026-09-22: `200`, `application/json; charset=utf-8`, 1,645 bytes,
 * `page.name` `"Streamtime"`, `page.url` `"https://streamtime.statuspage.io"`.
 * It is a genuine Atlassian Statuspage instance, so the document shape is the
 * standard `page` / `components` / `incidents` / `scheduled_maintenances` /
 * `status` one.
 *
 * ## Which component answers the question
 *
 * The page carries four components — `Frontend`, `API`, `Streamtime.net` and
 * `MCP API` — and only one of them is about the REST API this app calls. The
 * roll-up verdict is therefore taken from the component **named exactly `API`**
 * (`yk5flc04qqv8` at the time of writing), not from the page-level
 * `status.indicator` and not from the worst of all four: a Frontend outage
 * during a deploy says nothing about whether a workflow's job read will work,
 * and reporting it as an app-wide failure would be wrong in the direction that
 * makes people ignore health checks.
 *
 * The match is **exact, not a substring** — `MCP API` sits on the same page and
 * is a different product surface (the vendor's own description: "Dedicated API
 * for our MCP Server"), so a `contains "API"` rule would silently report the
 * wrong component.
 *
 * All four components are still reported under `components`, so a reader can see
 * which part of the product is unhappy even when the verdict comes from `API`.
 *
 * `credential: "none"` and its own `network` allowlist: the status host is a
 * third party that must never be handed the user's bearer token, and the
 * validator enforces that a check which widens egress is unsigned.
 */

export const STATUS_URL = "https://streamtime.statuspage.io/api/v2/summary.json";

/** The component whose status is this app's verdict. Matched exactly. */
export const API_COMPONENT_NAME = "API";

export interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  description?: string | null;
  group?: boolean;
}

export interface StatusSummary {
  page?: { name?: string; url?: string };
  status?: { indicator?: string; description?: string };
  components?: StatusComponent[];
  incidents?: unknown[];
  scheduled_maintenances?: unknown[];
}

/**
 * Statuspage's component status vocabulary — three values, not the four the
 * page-level indicator uses.
 */
export function mapComponentStatus(status: string | undefined): HealthState {
  switch ((status ?? "").trim()) {
    case "operational":
      return "ok";
    case "degraded_performance":
    case "partial_outage":
      return "degraded";
    case "major_outage":
      return "down";
    case "under_maintenance":
      return "degraded";
    default:
      return "unknown";
  }
}

/**
 * Stable key for a component: the vendor id, which is what the page's own
 * incident records reference and what survives a rename. A slug fallback keeps
 * a future page that drops ids from reporting nothing at all.
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

/** Worst-first, matching the pack's health-state ranking. */
function worst(states: HealthState[]): HealthState {
  const rank: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };
  return states.reduce<HealthState>((a, b) => (rank[b] > rank[a] ? b : a), "ok");
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Streamtime platform status",
  description:
    "The `API` component of streamtime.statuspage.io, with the page's other components (Frontend, " +
    "Streamtime.net, MCP API) reported alongside it.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["streamtime.statuspage.io"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Streamtime — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a redirect or rebrand silently pointing this probe at
    // somebody else's status page.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)streamtime\.statuspage\.io(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Streamtime's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, index) => {
      const state = mapComponentStatus(node.status);
      // The name goes in the message even when healthy: the key is an opaque
      // vendor id, so without it a reader cannot tell which component this is.
      components[componentKey(node, index)] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    });

    const api = nodes.find((node) => node.name === API_COMPONENT_NAME);
    if (!api) {
      // The page reshaped and the component this check speaks for is gone.
      // Reporting the other components' worst case would be reporting a
      // different product's outage as this app's.
      return {
        state: "unknown",
        message: `status page no longer lists a component named "${API_COMPONENT_NAME}"`,
        components,
      };
    }

    const state = mapComponentStatus(api.status);
    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    const openIncidents = body.incidents?.length ?? 0;
    const maintenance = body.scheduled_maintenances?.length ?? 0;

    const notes: string[] = [];
    notes.push(`${API_COMPONENT_NAME} ${api.status ?? "status unknown"}`);
    if (state === "ok" && body.status?.description) notes.push(body.status.description);
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s)`);
    if (maintenance > 0) notes.push(`${maintenance} scheduled maintenance window(s)`);

    return {
      // The verdict is the API component; the other components are detail.
      state,
      message: notes.join("; "),
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;

/** Exported for the entry-module test, which pins the roll-up rule. */
export const serviceWorst = worst;
