import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.mural.co/api/v2/summary.json";
export const PAGE_ID = "dbk70dpy3n7h";

/**
 * status.mural.co is an Atlassian Statuspage. Verified 2026-10-06:
 *
 *  - `/api/v2/summary.json` answers 200 JSON (not an HTML catch-all) with
 *    `page.id` `dbk70dpy3n7h`, `page.name` "Mural", `page.url` https://status.mural.co.
 *    `/index.json` and `/history.atom` also answer 200, but the Statuspage schema
 *    is what `summary.json` returns.
 *  - Mural publishes no component named "API". The ones an API call depends on are
 *    pinned by id: Authentication (`80j005qsrmjz`), Integrations (`980p5ptyrrpg`),
 *    Mural Database (`806d95z94y9d`), Canvas (`42zc4v22b21z`), Realtime
 *    collaboration (`j5mdtth26nww`), Search (`fdfdjpgcjdfj`), Dashboard
 *    (`fgzhznrlzjqm`) and Exports (`9hx4nz71759s`). Billing, Notifications, Learning
 *    and Website are excluded: an outage there does not stop an API call.
 *  - The page-level indicator is not used, because it rolls up the excluded
 *    components too.
 */
const COVERED = new Set([
  "80j005qsrmjz",
  "980p5ptyrrpg",
  "806d95z94y9d",
  "42zc4v22b21z",
  "j5mdtth26nww",
  "fdfdjpgcjdfj",
  "fgzhznrlzjqm",
  "9hx4nz71759s",
]);

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
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
  title: "Mural platform status",
  description: "Component status from status.mural.co for the services a Mural API call " +
    "depends on (authentication, canvas, database, integrations, search, exports).",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.mural.co"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };
    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };
    if (body.page?.id !== PAGE_ID) {
      return { state: "unknown", message: "status page no longer self-identifies as Mural's" };
    }

    const nodes = (body.components ?? []).filter((c) =>
      c?.id && COVERED.has(c.id) && c.group !== true
    );
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned none of the covered components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const state = mapComponentStatus(node.status);
      components[node.id!] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    }
    const state = worstHealthState(Object.values(components).map((c) => c.state));
    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    return {
      state,
      message: affected.length > 0
        ? `affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`
        : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
