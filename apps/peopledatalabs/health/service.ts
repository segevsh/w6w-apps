/**
 * Is People Data Labs up?
 *
 * ## The status page is real. Checked 2026-10-06
 *
 * PDL publishes at **`status.peopledatalabs.com`**, an Atlassian Statuspage: `/api/v2/summary.json`
 * answers 200 JSON in the Statuspage v2 schema, with `page.name` "People Data Labs" and
 * `page.id` `dxgjh0ymdqy6`. Its components are PDL's own — Person Enrichment, Person Search,
 * Person Identify, Company Enrichment/Search, Cleaner APIs, Autocomplete, Job Title Enrichment,
 * IP Enrichment, Job Posting Search — so the page does describe the API.
 *
 * ## What decides the verdict
 *
 * The page-level `status.indicator` also folds in the web portal, login service, Auth0 and the
 * free sandbox, none of which stops an API call from working in production. So the verdict is the
 * worst state among the API components only; the dashboard and sandbox groups are listed as
 * detail, and group rows (whose state mirrors their children) are skipped.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.peopledatalabs.com/api/v2/summary.json";
export const PAGE_ID = "dxgjh0ymdqy6";
/** Group ids whose children are not part of the production API. */
export const DETAIL_GROUPS = new Set([
  "vl73z6lnzk16", // API Dashboard (web portal, login, Auth0)
  "53zq69ntwsrz", // API Sandbox
]);

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
  incidents?: Array<{ name?: string }>;
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

const service: HealthCheckDefinition = {
  key: "service",
  title: "People Data Labs platform status",
  description:
    "Component status from status.peopledatalabs.com. The verdict is the worst of the production API components (person, company, cleaner, autocomplete, job title, IP and job posting APIs); the web dashboard, login and sandbox are shown but do not drive it.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.peopledatalabs.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };
    if (body.page?.id !== PAGE_ID) {
      return { state: "unknown", message: "status page no longer self-identifies as PDL's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const isApi = (c: StatusComponent) => !(c.group_id && DETAIL_GROUPS.has(c.group_id));
    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, i) => {
      const state = mapComponentStatus(node.status);
      components[node.id ?? `component-${i}`] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    });

    const apiNodes = nodes.filter(isApi);
    const state = apiNodes.length === 0
      ? "unknown"
      : worstHealthState(apiNodes.map((n) => mapComponentStatus(n.status)));

    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    const notes: string[] = [];
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }
    const incidents = body.incidents?.length ?? 0;
    if (incidents > 0) notes.push(`${incidents} open incident(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
