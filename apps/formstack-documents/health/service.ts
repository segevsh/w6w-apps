import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

/**
 * Is Formstack Documents up?
 *
 * ## Finding the page (checked 2026-10-06)
 *
 *   | Candidate | What it is |
 *   | --- | --- |
 *   | `status.formstack.com` | 301s to `www.intellistackstatus.com` — the parent brand's page |
 *   | `www.intellistackstatus.com/api/v2/summary.json` | Real Statuspage JSON, `page.name: "Intellistack"` |
 *
 * It covers the whole portfolio (Forms, Sign, Workflows, ...), so the page-level
 * indicator is NOT used — an outage in another product would mark this app down.
 * Instead the check reads only the component group named **Formstack Documents**
 * (group id `zt11rdz1rk9k`: `API & Document Generation`, `Website & Management
 * Portal`, `SendGrid API v3`, `SendGrid SMTP`, `Billing Services`). The verdict
 * is the worse of the first two — the REST API and the web app — and the other
 * three are reported as components without driving the state (SendGrid affects
 * email *deliveries*, not the API).
 *
 * The group is found by id first and by name as a fallback, and a page that stops
 * naming the vendor is `unknown`, never `down`.
 */
export const STATUS_URL = "https://www.intellistackstatus.com/api/v2/summary.json";
export const GROUP_ID = "zt11rdz1rk9k";
const GROUP_NAME = "Formstack Documents";
const DRIVERS = ["API & Document Generation", "Website & Management Portal"];

interface Component {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
  group_id?: string | null;
}

interface Summary {
  page?: { name?: string; url?: string };
  components?: Component[];
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

const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };

const service: HealthCheckDefinition = {
  key: "service",
  title: "Formstack Documents status",
  description:
    "The Formstack Documents component group on www.intellistackstatus.com (Intellistack, Formstack's parent brand). The verdict follows the REST API and web app components.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["www.intellistackstatus.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Statuspage returned ${res.status}` };
    const body = await res.json().catch(() => null) as Summary | null;
    if (!body) return { state: "unknown", message: "Statuspage returned an unreadable body" };

    const identity = `${body.page?.name ?? ""} ${body.page?.url ?? ""}`;
    if (identity.trim() && !/intellistack|formstack/i.test(identity)) {
      return {
        state: "unknown",
        message: "status page no longer identifies as Intellistack's or Formstack's",
      };
    }

    const all = body.components ?? [];
    const groupId = all.find((c) => c.group === true && c.id === GROUP_ID)?.id ??
      all.find((c) => c.group === true && c.name === GROUP_NAME)?.id;
    const nodes = all.filter((c) =>
      c.group !== true && c.name && groupId && c.group_id === groupId
    );
    if (nodes.length === 0) {
      return { state: "unknown", message: `no "${GROUP_NAME}" components on the status page` };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const state = mapComponentStatus(node.status);
      components[node.id ?? node.name!] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    }

    const drivers = nodes.filter((n) => DRIVERS.includes(n.name!));
    if (drivers.length === 0) {
      return {
        state: "unknown",
        message: "API component missing from the status page",
        components,
      };
    }
    let state: HealthState = "ok";
    for (const d of drivers) {
      const s = mapComponentStatus(d.status);
      if (RANK[s] > RANK[state]) state = s;
    }
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
