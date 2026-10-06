/**
 * Is Wistia up?
 *
 * ## The status page is real, and it is Instatus — not Statuspage
 *
 * Checked 2026-10-06. `status.wistia.com` serves `page.name: "Wistia"`; its
 * `/api/v2/summary.json` is Instatus's tiny `{page: {name, url, status}}` (74 bytes, no
 * components) and `/api/v2/components.json` carries the component list. A nonsense sibling
 * (`/api/v2/zz-not-real.json`) is a 404, so this is not a catch-all. Statuspage's
 * `components[].status` vocabulary does not apply: Instatus spells states
 * `OPERATIONAL`, `UNDERMAINTENANCE`, `DEGRADEDPERFORMANCE`, `PARTIALOUTAGE`, `MAJOROUTAGE`.
 *
 * ## No component is the API
 *
 * The 12 components are Group Record, Billing, Transcripts, Record, Edit, wistia.com, App,
 * Uploads, Encoding, Stats, Embeds and Live. None is named "API". The Data API reads and
 * writes what App, Uploads, Encoding and Stats describe, so those four decide the verdict and
 * the rest are reported but never move it. Because that mapping is inference, the check is
 * declared `informational`.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.wistia.com/api/v2/components.json";

/** Components whose state is evidence about the Data API. */
export const API_COMPONENTS = ["App", "Uploads", "Encoding", "Stats"];

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  isParent?: boolean;
}

export function mapStatus(status: string | undefined): HealthState {
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
  title: "Wistia platform status",
  description:
    "Component status from status.wistia.com (Instatus). INFORMATIONAL: no component is named " +
    "API, so App, Uploads, Encoding and Stats stand in for it.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  network: { allow: ["status.wistia.com"] },
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as { components?: StatusComponent[] } | null;
    const nodes = (body?.components ?? []).filter((c) => c?.name && c.isParent !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const state = mapStatus(node.status);
      components[node.id ?? node.name!] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    }

    const relevant = nodes.filter((n) => API_COMPONENTS.includes(n.name!));
    if (relevant.length === 0) {
      return {
        state: "unknown",
        message: "None of the API-relevant components were listed",
        components,
      };
    }
    const state = worstHealthState(relevant.map((n) => mapStatus(n.status)));
    const affected = nodes.filter((n) => mapStatus(n.status) !== "ok");

    return {
      state,
      message: affected.length
        ? `affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`
        : undefined,
      components,
      ttlSeconds: 300,
    };
  },
};

export default service;
