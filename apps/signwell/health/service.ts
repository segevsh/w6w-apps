/**
 * Is SignWell up?
 *
 * ## The status page is real, and it is Statuspage
 *
 * Checked 2026-10-06. `status.signwell.com/api/v2/summary.json` answers 200
 * `application/json` with `page.name: "SignWell"`, `page.url: "https://status.signwell.com"` and
 * the Atlassian Statuspage v2 shape (`components[]` with `group`/`group_id`/`page_id`,
 * `incidents`, `scheduled_maintenances`, `status.indicator`). `/api/v2/status.json` is also a 200
 * and a nonsense sibling (`/api/v2/zz-not-real.json`) is a 404, so this is not a catch-all. The
 * host does not redirect, so the allowlisted URL is the one fetched.
 *
 * ## No component covers the API
 *
 * The page lists exactly one component, `Docsketch Service` (SignWell's sibling product), and
 * nothing named API, documents, or signing. So the verdict is the page's top-level
 * `status.indicator`, and because that is inference about the API rather than a statement of it,
 * the check is declared `informational`. The component is still reported as detail.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.signwell.com/api/v2/summary.json";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatusComponent[];
  incidents?: unknown[];
  scheduled_maintenances?: unknown[];
  status?: { indicator?: string; description?: string };
}

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
  title: "SignWell platform status",
  description:
    "Top-level indicator from status.signwell.com (Statuspage). INFORMATIONAL: the page's only " +
    "component is `Docsketch Service`, so nothing on it is specifically the API.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  network: { allow: ["status.signwell.com"] },
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Name AND schema: a page that is not SignWell's, or not Statuspage-shaped, proves nothing.
    if (body.page?.name !== "SignWell") {
      return { state: "unknown", message: "status page no longer self-identifies as SignWell's" };
    }
    if (!Array.isArray(body.components) || typeof body.status?.indicator !== "string") {
      return { state: "unknown", message: "Status page is not in the Statuspage v2 shape" };
    }

    const components: Record<string, HealthComponentReport> = {};
    body.components.filter((c) => c?.name && c.group !== true).forEach((c, i) => {
      const state = mapComponentStatus(c.status);
      components[c.id ?? `component-${i}`] = state === "ok"
        ? { state, message: c.name }
        : { state, message: `${c.name}: ${c.status}` };
    });

    const state = mapIndicator(body.status.indicator);
    const notes: string[] = [];
    if (body.status.description) notes.push(body.status.description);
    const open = body.incidents?.length ?? 0;
    if (open > 0) notes.push(`${open} open incident(s)`);
    const maintenance = body.scheduled_maintenances?.length ?? 0;
    if (maintenance > 0) notes.push(`${maintenance} scheduled maintenance window(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 300,
    };
  },
};

export default service;
