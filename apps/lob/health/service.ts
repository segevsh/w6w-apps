/**
 * Is Lob up?
 *
 * ## The status page is real. It was checked on 2026-10-06
 *
 * Lob publishes at **`status.lob.com`**, an Atlassian Statuspage — but `status.lob.com` answers
 * `302` and the data lives on **`lob.statuspage.io`**. The runtime allowlists the URL it is
 * handed, not a redirect target, so this check names `lob.statuspage.io` directly.
 *
 *   | Path                                   | Status  | Bytes | Notes                    |
 *   | -------------------------------------- | ------- | ----- | ------------------------ |
 *   | `/api/v2/summary.json`                 | 200     | 2,847 | Statuspage v2 summary    |
 *   | `/api/v2/status.json`                  | 200     | 222   | `status.indicator`       |
 *   | `/api/v2/definitely-not-real-zzz.json` | **404** | 0     | not a catch-all          |
 *
 * `page.name` is `Lob`, `page.id` is `2xkb3rfdd3lg`, and the components are Lob's own: `API`,
 * `Dashboard` (`dashboard.lob.com`) and `Webhooks`. The `API` component is the one that covers
 * `api.lob.com`. The schema is Atlassian's (`status.indicator`, `components[].status`), not
 * Instatus or Better Stack, so `status.indicator` is a real field.
 *
 * The page's `page.url` still reads `http://status.lob.com` (the vanity host), so the identity
 * guard pins the page **id** and accepts the name `Lob`, rather than matching the host the
 * data is served from.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`: Lob is SaaS-only, so an incident here
 * is evidence about every Connection. `credential: "none"` — a status host must never see an
 * API key.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://lob.statuspage.io/api/v2/summary.json";
export const STATUS_PAGE_ID = "2xkb3rfdd3lg";

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

/** Statuspage's component vocabulary. */
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

const service: HealthCheckDefinition = {
  key: "service",
  title: "Lob platform status",
  description:
    "Component status from status.lob.com (served from lob.statuspage.io): the API, the " +
    "Dashboard and Webhooks.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["lob.statuspage.io"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Lob — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Pin identity by page id (the page's own url is the vanity host, not the serving host).
    if (body.page?.id !== STATUS_PAGE_ID || body.page?.name !== "Lob") {
      return { state: "unknown", message: "status page no longer self-identifies as Lob's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, index) => {
      const state = mapComponentStatus(node.status);
      components[node.id ?? `component-${index}`] = state === "ok"
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
