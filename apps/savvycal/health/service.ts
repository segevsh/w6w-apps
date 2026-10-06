import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

/**
 * SavvyCal's status page is an Instatus page at `savvycal.instatus.com` (linked
 * from savvycal.com). `status.savvycal.com` does not resolve and
 * `savvycal.betteruptime.com` is somebody else's Better Stack default page.
 *
 * Instatus is not Atomic Statuspage: no `status.indicator`. `summary.json` is
 * `{page: {name, url, status: UP|HASISSUES|UNDERMAINTENANCE}}` and
 * `components.json` is `{components: [{id, name, status, group}]}`.
 */
export const SUMMARY_URL = "https://savvycal.instatus.com/summary.json";
export const COMPONENTS_URL = "https://savvycal.instatus.com/components.json";

/** The component that stands for the product and its API. */
export const API_COMPONENT = "App";

interface Component {
  id?: string;
  name?: string;
  status?: string;
  group?: { id?: string; name?: string } | null;
}

export function mapComponentStatus(status: string | undefined): HealthState {
  switch (status) {
    case "OPERATIONAL":
      return "ok";
    case "UNDERMAINTENANCE":
    case "DEGRADEDPERFORMANCE":
    case "PARTIALOUTAGE":
      return "degraded";
    case "MAJOROUTAGE":
      return "down";
    default:
      return "unknown";
  }
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "SavvyCal platform status",
  description:
    "Component status from savvycal.instatus.com. The verdict follows the `App` component; " +
    "calendar-connection and integration components are reported but do not move it.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["savvycal.instatus.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const summaryRes = await ctx.fetch(SUMMARY_URL, { headers: { accept: "application/json" } });
    if (!summaryRes.ok) {
      return { state: "unknown", message: `Status page returned ${summaryRes.status}` };
    }
    const summary = await summaryRes.json().catch(() => null) as
      | { page?: { name?: string; url?: string; status?: string } }
      | null;
    if (!summary?.page) return { state: "unknown", message: "Status page body was unreadable" };
    if (summary.page.name !== "SavvyCal") {
      return { state: "unknown", message: "status page no longer self-identifies as SavvyCal's" };
    }

    const compRes = await ctx.fetch(COMPONENTS_URL, { headers: { accept: "application/json" } });
    if (!compRes.ok) {
      return { state: "unknown", message: `Components feed returned ${compRes.status}` };
    }
    const compBody = await compRes.json().catch(() => null) as { components?: Component[] } | null;
    // Group rows mirror their children; report leaf components only.
    const all = compBody?.components ?? [];
    const groupIds = new Set(all.map((c) => c.group?.id).filter(Boolean));
    const nodes = all.filter((c) => c.name && !(c.id && groupIds.has(c.id)));
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page listed no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const state = mapComponentStatus(node.status);
      components[node.id ?? node.name!] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    }

    const app = nodes.find((n) => n.name === API_COMPONENT);
    const state = app
      ? mapComponentStatus(app.status)
      : worstHealthState(Object.values(components).map((c) => c.state));
    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    return {
      state,
      message: affected.length
        ? `affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`
        : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
