import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.betterstack.com/index.json";

/**
 * status.betterstack.com is a Better Stack-hosted page, so it speaks Better
 * Stack's own JSON:API status schema, NOT Atlassian Statuspage's: there is no
 * `status.indicator` and no `components[]`. The shape (measured 2026-10-06):
 * `data.attributes.aggregate_state`, plus an `included[]` of
 * `status_page_section` and `status_page_resource` rows. A resource carries
 * `status_page_section_id`, `public_name` and `status`.
 *
 * The page is real and ours: `data.id` is `133002`, `company_name` is
 * "Better Stack" and `custom_domain` is `status.betterstack.com`. It has three
 * sections — "Better Stack", "Uptime", "Telemetry" — and the Uptime API is
 * covered by the first two. **"Telemetry" is a sibling product with its own API
 * (not part of this app), so it is excluded: a Telemetry ingestion incident
 * must not report this app down.** That is also why `aggregate_state`, which
 * rolls all three up, is not used.
 */
const COVERED_SECTIONS = new Set(["better stack", "uptime"]);
export const PAGE_ID = "133002";

interface Included {
  id?: string;
  type?: string;
  attributes?: Record<string, unknown>;
}

interface StatusIndex {
  data?: { id?: string; attributes?: Record<string, unknown> };
  included?: Included[];
}

/** Resource `status` values seen on the wire plus the documented ones. `null` = not a signal. */
export function mapResourceStatus(status: unknown): HealthState | null {
  switch (status) {
    case "operational":
      return "ok";
    case "degraded":
    case "maintenance":
      return "degraded";
    case "downtime":
      return "down";
    case "not_monitored":
      return null;
    default:
      return "unknown";
  }
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Better Stack Uptime status",
  description:
    "Component status from status.betterstack.com, limited to the 'Better Stack' and 'Uptime' " +
    "sections. The 'Telemetry' section is a different product and is ignored.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.betterstack.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as StatusIndex | null;
    if (!body?.data) {
      return { state: "unknown", message: "Status page returned an unreadable body" };
    }

    // The page must still be Better Stack's own, in the schema this reads.
    if (
      body.data.id !== PAGE_ID || body.data.attributes?.custom_domain !== "status.betterstack.com"
    ) {
      return {
        state: "unknown",
        message: "status page no longer self-identifies as Better Stack's",
      };
    }

    const included = body.included ?? [];
    const covered = new Set(
      included
        .filter((i) => i.type === "status_page_section")
        .filter((i) => COVERED_SECTIONS.has(String(i.attributes?.name ?? "").trim().toLowerCase()))
        .map((i) => String(i.id)),
    );

    const components: Record<string, HealthComponentReport> = {};
    const affected: string[] = [];
    for (const r of included) {
      if (r.type !== "status_page_resource") continue;
      if (!covered.has(String(r.attributes?.status_page_section_id))) continue;
      const state = mapResourceStatus(r.attributes?.status);
      if (state === null) continue;
      const name = String(r.attributes?.public_name ?? r.id);
      components[String(r.id)] = state === "ok"
        ? { state, message: name }
        : { state, message: `${name}: ${r.attributes?.status}` };
      if (state !== "ok") affected.push(`${name} (${r.attributes?.status})`);
    }

    const states = Object.values(components).map((c) => c.state);
    if (states.length === 0) {
      return { state: "unknown", message: "Status page listed no Uptime components" };
    }
    return {
      state: worstHealthState(states),
      message: affected.length > 0 ? `affected: ${affected.join(", ")}` : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
