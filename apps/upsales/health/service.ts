/**
 * Is Upsales up?
 *
 * ## The status page is real (checked 2026-10-06)
 *
 * `status.upsales.com` is an Atlassian Statuspage. `/api/v2/summary.json` answers 200
 * `application/json` with the Statuspage v2 schema, `page.name` `"Upsales"`, `page.id`
 * `xgxqnwgpzcyz`, `page.url` `https://status.upsales.com`. Not a catch-all and no redirect.
 *
 * ## ...but it does not name the API
 *
 * Its 15 components (5 are group containers) are `Upsales App`, `Mail Events`,
 * `Fortnox integration`, `Prospecting`, `Outgoing Email`, `File service`,
 * `Other integrations`, `Office 365 calendar sync`, `Insights`, `Gmail`, `PE Accounting`,
 * `Chat`, and the groups `Email`, `Integrations`, `System components`. There is **no
 * component called API**. The API is served by the same platform as `Upsales App`, so this
 * page is evidence about the API but not a statement of it. That is why this check is
 * `informational`: an incident here is worth showing, and must not mark every working
 * connection degraded. The live reachability of the API host itself is the `api` check.
 *
 * ## Verdict
 *
 * The page-level `status.indicator` is the verdict (`none|minor|major|critical|maintenance`);
 * components are the detail. A page that stops self-identifying as Upsales reports `unknown`.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.upsales.com/api/v2/summary.json";
export const PAGE_ID = "xgxqnwgpzcyz";

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
  title: "Upsales platform status",
  description: "Component status from status.upsales.com (Upsales App, email, integrations, " +
    "file service and more). The page has no API-specific component; see the `api` check for " +
    "reachability of the API host itself.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  network: { allow: ["status.upsales.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    if (body.page?.id !== PAGE_ID || body.page?.name !== "Upsales") {
      return { state: "unknown", message: "status page no longer self-identifies as Upsales'" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, i) => {
      const state = mapComponentStatus(node.status);
      components[node.id ?? `component-${i}`] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    });

    const state = mapIndicator(body.status?.indicator);
    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    const notes: string[] = [];
    if (body.status?.description) notes.push(body.status.description);
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }
    const open = body.incidents?.length ?? 0;
    if (open > 0) notes.push(`${open} open incident(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
