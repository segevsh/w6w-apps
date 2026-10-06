/**
 * Is Autotask PSA up?
 *
 * ## Verified 2026-10-06
 *
 * Autotask (Datto, now Kaseya) is reported on Kaseya's Atlassian Statuspage. `status.datto.com`
 * redirects to `status.kaseya.com`, and the runtime allowlists the URL it is given rather than the
 * redirect target, so this declares the final host. `GET /api/v2/components.json` answers 200 and
 * self-identifies as `page.id: "43vzbh696nvp"`, `page.name: "Kaseya Inc"`: the page is Kaseya's
 * whole portfolio (424 components), so it must be narrowed.
 *
 * ## One group, and its children are regions, not zones
 *
 * The component group "Autotask PSA" (`w1dfzxttcs2v`) holds 20 children named by REGION and
 * datacentre ("America East 2", "UK (United Kingdom)", "Australia / New Zealand 4", plus
 * "Report Data Warehouse"...). They do not carry the `webservicesN` zone number, and this check
 * is app-scope, so it cannot say which child is the caller's. It therefore reports every child
 * and decides conservatively: one affected region is `degraded` (it may not be yours), and only
 * every region being in a major outage is `down`.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_HOST = "status.kaseya.com";
export const STATUS_URL = `https://${STATUS_HOST}/api/v2/components.json`;
export const PAGE_ID = "43vzbh696nvp";
export const GROUP_ID = "w1dfzxttcs2v";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
  group_id?: string | null;
}

/** Statuspage's documented component vocabulary. */
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
  title: "Autotask PSA platform status",
  description: 'The regional components of the "Autotask PSA" group on status.kaseya.com. A ' +
    "single affected region is degraded because the feed does not say which zone it is; only " +
    "every region in a major outage is down.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Autotask, so never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as
      | { page?: { id?: string }; components?: StatusComponent[] }
      | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // The page id, not its name, is the provenance check: it is Kaseya's page by design.
    if (body.page?.id !== PAGE_ID) {
      return { state: "unknown", message: "status page no longer has the expected page id" };
    }

    const children = (body.components ?? []).filter((c) =>
      c?.group_id === GROUP_ID && c.group !== true && c.name
    );
    if (children.length === 0) {
      return { state: "unknown", message: 'no components found in the "Autotask PSA" group' };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const child of children) {
      const s = mapComponentStatus(child.status);
      components[child.id ?? child.name!] = s === "ok"
        ? { state: s, message: child.name }
        : { state: s, message: `${child.name}: ${child.status}` };
    }

    const states = children.map((c) => mapComponentStatus(c.status));
    const affected = children.filter((c) => mapComponentStatus(c.status) !== "ok");
    let state: HealthState = "ok";
    if (states.every((s) => s === "down")) state = "down";
    else if (states.some((s) => s === "down" || s === "degraded")) state = "degraded";
    else if (states.some((s) => s === "unknown")) state = "unknown";

    return {
      state,
      message: affected.length > 0
        ? `affected: ${affected.map((c) => `${c.name} (${c.status})`).join(", ")}`
        : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
