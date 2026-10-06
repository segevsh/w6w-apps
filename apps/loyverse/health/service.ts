import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

/**
 * Loyverse's Atlassian Statuspage, verified 2026-10-06.
 *
 * `status.loyverse.com` CNAMEs to the Statuspage customer host
 * (`0pphh991mx84.stspg-customer.com`) but its `/api/v2/summary.json` answers
 * `302 https://www.statuspage.io/` — Statuspage's marketing page — so the
 * custom domain is NOT the machine-readable endpoint. The canonical
 * `loyverse.statuspage.io` is. Its `page.name` is `Loyverse` and `page.id`
 * `0pphh991mx84` equals the id in the custom domain's CNAME, which is the
 * provenance check; the page has a `Loyverse API` component
 * (`qxrrr61qq9pr`, "Loyverse API services").
 */
export const STATUS_HOST = "loyverse.statuspage.io";
export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;
export const PAGE_ID = "0pphh991mx84";
export const API_COMPONENT_ID = "qxrrr61qq9pr";
export const API_COMPONENT_NAME = "Loyverse API";

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

export function findApiComponent(components: StatusComponent[]): StatusComponent | undefined {
  return components.find((c) => c.id === API_COMPONENT_ID) ??
    components.find((c) =>
      (c.name ?? "").trim().toLowerCase() === API_COMPONENT_NAME.toLowerCase()
    );
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Loyverse platform status",
  description:
    "The `Loyverse API` component on Loyverse's Statuspage. POS app, Back Office, Billing and " +
    "Website are reported as detail but never drive the verdict.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    if (body.page?.id !== PAGE_ID) {
      return { state: "unknown", message: "status page no longer self-identifies as Loyverse's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) return { state: "unknown", message: "Status page has no components" };

    const api = findApiComponent(nodes);
    if (!api) {
      return {
        state: "unknown",
        message: "status page no longer publishes a `Loyverse API` component",
      };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const state = mapComponentStatus(node.status);
      components[node.id ?? node.name!] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    }

    const state = mapComponentStatus(api.status);
    const notes: string[] = [];
    if (state !== "ok") notes.push(`API: ${api.status}`);
    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
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
