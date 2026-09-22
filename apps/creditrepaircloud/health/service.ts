import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

/**
 * Is the Credit Repair Cloud API up? — Atlassian Statuspage, verified live
 * 2026-09-22.
 *
 * ## A real, claimed, actively-maintained page — checked three ways
 *
 * Three candidate hosts were probed the way this pack always does:
 *
 *   | Host                                     | Result |
 *   | ---------------------------------------- | ------ |
 *   | `status.creditrepaircloud.com`           | 200, `<title>CRC Status</title>`, page id `v53pwns8kml6`, `page.name` `"CRC"` |
 *   | `creditrepaircloud.statuspage.io`        | 302 to `/inactive` — the default subdomain, abandoned in favour of the custom domain above |
 *   | `creditrepaircloud.instatus.com`         | redirects to Instatus's own marketing homepage — a dead decoy |
 *
 * `https://status.creditrepaircloud.com/api/v2/summary.json` answered
 * `application/json` and named vendor-specific components: `CreditRepairCloud`,
 * `SecureClientAccess`, `API` (`"description":"Backend API Service"`),
 * `Billing API` and `Signup`, with `updated_at` current to the minute at check
 * time and `created_at` in Dec 2025. (A second look the same day showed the
 * vendor had added three more — `Report Processor`, `Cloudmail`, `CHS` —
 * which is exactly the point: an actively maintained page grows, and this check
 * is deliberately component-count-agnostic.) That is an actively maintained page
 * for this product, not a Statuspage default: the tell for the latter is a
 * component literally named `"API (example)"` (see `apps/hedy`'s README), and
 * CRC's names nothing of the sort.
 *
 * ## It tracks the `API` component, not the page roll-up
 *
 * Most of the components are end-user surfaces this app never touches — the CRM
 * itself, client-portal access, billing, signup. One of them, `API`, is the
 * backend service every Action here calls, so its own status is the verdict, the
 * same distinction `apps/webinarjam/health/service.ts` draws for WebinarJam's
 * `API` component. The page-wide `status.indicator` is used only as a fallback,
 * if a future redesign drops the component.
 *
 * Every other component is still reported — in `components` and in the message
 * — because "the portal is down but the API is fine" is exactly the situation a
 * reader needs to see without opening the status page.
 *
 * ## Severity stays at the `degraded` default
 *
 * Credit Repair Cloud is SaaS-only — there is no self-hosted CRC — so every
 * Connection this app can hold runs on exactly the infrastructure this page
 * describes, and an incident here really is evidence about every tenant. That
 * is the opposite of `apps/apify`'s reasoning for leaving its own check
 * `informational` (nothing), and the same reasoning that keeps this one at the
 * default.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below —
 * a status host must never see an API key.
 */
export const STATUS_URL = "https://status.creditrepaircloud.com/api/v2/summary.json";

/** The component this app's Actions actually call. */
const API_COMPONENT_NAME = "API";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  description?: string;
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
function mapComponentStatus(status: string | undefined): HealthState {
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
function mapIndicator(indicator: string | undefined): HealthState {
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

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Credit Repair Cloud platform status",
  description: 'Atlassian Statuspage rollup for status.creditrepaircloud.com, tracking the "API" ' +
    "component this app's actions actually call. Unauthenticated and unsigned.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.creditrepaircloud.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    // A broken status API says nothing about Credit Repair Cloud — never `down`.
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently repointing this probe
    // at someone else's page — a healthy, claimed status page belonging to an
    // entirely different product is the failure mode this catches.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.creditrepaircloud\.com(\/|$)/i.test(pageUrl)) {
      return {
        state: "unknown",
        message: "status page no longer self-identifies as Credit Repair Cloud's",
      };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    let apiState: HealthState | undefined;
    for (const [index, node] of nodes.entries()) {
      const state = mapComponentStatus(node.status);
      const key = node.id ?? `${slug(node.name ?? "")}-${index}`;
      // The name goes in the message even when healthy: the key may be an
      // opaque vendor id, so without it a reader cannot tell which row this is.
      components[key] = state === "ok" ? { state, message: node.name } : {
        state,
        message: `${node.name}: ${node.status}`,
      };
      if (node.name === API_COMPONENT_NAME) apiState = state;
    }

    // Prefer the named API component's own state over the page-wide roll-up:
    // that roll-up reflects the worst of all five components, four of them
    // end-user surfaces (the CRM, client portal access, billing, signup)
    // unrelated to this app's surface.
    const state = apiState ?? mapIndicator(body.status?.indicator);

    const notes: string[] = [];
    if (apiState === undefined) {
      notes.push(
        `"${API_COMPONENT_NAME}" component not found in status feed; falling back to the ` +
          "page-wide rollup",
      );
    }
    const others = nodes
      .filter((n) => n.name !== API_COMPONENT_NAME)
      .map((n) => `${n.name} (${n.status})`);
    if (others.length > 0) notes.push(`other components: ${others.join(", ")}`);
    if (body.status?.description) notes.push(body.status.description);
    const openIncidents = body.incidents?.length ?? 0;
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s)`);
    const maintenance = body.scheduled_maintenances?.length ?? 0;
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
