/**
 * Is Docparser up?
 *
 * Checked 2026-10-06. `status.docparser.com` is an Atlassian Statuspage: `/api/v2/summary.json`
 * parses as the Statuspage v2 schema (`page.id` `sgnls0ysl2gt`, `page.name` "Docparser",
 * `components[]`, `incidents`, `status.indicator`), and a nonsense sibling path
 * (`/api/v2/zz.json`) is a 404, so it is not a catch-all.
 *
 * The page has a component literally named "HTTP REST API" ("Our API which lets you import
 * documents and obtain parsed data"). The verdict is pinned to that component; the others
 * (Docparser Application, Webhook Integrations, Email Reception Server) are reported but
 * never move it, since a webhook or inbox incident does not stop the REST API.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.docparser.com/api/v2/summary.json";
export const API_COMPONENT = "HTTP REST API";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { name?: string; url?: string };
  components?: StatusComponent[];
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

const service: HealthCheckDefinition = {
  key: "service",
  title: "Docparser REST API status",
  description:
    "Status of the 'HTTP REST API' component on status.docparser.com. Other components " +
    "(application, webhooks, email reception) are reported but do not decide the verdict.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.docparser.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };
    if (body.page?.name !== "Docparser") {
      return { state: "unknown", message: "status page no longer self-identifies as Docparser's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const state = mapComponentStatus(node.status);
      components[node.id ?? node.name!] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    }

    const api = nodes.find((n) => n.name === API_COMPONENT);
    if (!api) {
      return { state: "unknown", message: `No "${API_COMPONENT}" component listed`, components };
    }
    const state = mapComponentStatus(api.status);
    return {
      state,
      message: state === "ok" ? undefined : `${API_COMPONENT}: ${api.status}`,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
