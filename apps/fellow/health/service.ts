/**
 * Is Fellow's Developer API up?
 *
 * ## The status page is real and has an API component (checked 2026-10-05)
 *
 * Fellow publishes at **`status.fellow.ai`** (`status.fellow.app` 301s there;
 * the runtime allowlists the URL you pass, not the redirect target, so the
 * `.ai` host is the one declared). `/api/v2/summary.json` answers the
 * Statuspage-compatible schema — `status.indicator`, `components[]` — with
 * `page.name` "Fellow", and a bogus sibling path (`/api/v2/nope-zzz.json`) is a
 * hard 404 with an empty body, so this is not a catch-all. Its eight components
 * are Fellow's own and include a dedicated **`Developer API`**, which is what
 * this app talks to: the page-level indicator also rolls up Website, MCP, Bot
 * Meeting Recording and Glean, so a Website blip would otherwise report the API
 * down. The verdict is therefore the Developer API component's, with the
 * indicator only as a fallback when that component is absent.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.fellow.ai/api/v2/summary.json";
export const API_COMPONENT = /developer\s*api/i;

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { name?: string; url?: string };
  components?: StatusComponent[];
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
  title: "Fellow Developer API status",
  description:
    "The Developer API component on status.fellow.ai, with the other Fellow components " +
    "(application, website, MCP, bot recording, summarization) reported as detail.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.fellow.ai"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.fellow\.ai(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Fellow's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) return { state: "unknown", message: "Status page had no components" };

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, i) => {
      const state = mapComponentStatus(node.status);
      components[node.id ?? `component-${i}`] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    });

    const api = nodes.find((n) => API_COMPONENT.test(n.name ?? ""));
    const state = api ? mapComponentStatus(api.status) : mapIndicator(body.status?.indicator);

    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    const message = affected.length > 0
      ? `affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`
      : undefined;

    return { state, message, components, ttlSeconds: 60 };
  },
};

export default service;
