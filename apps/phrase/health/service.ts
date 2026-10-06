import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { type Region, regionFromConnection } from "../lib/client.ts";

/**
 * Phrase Strings platform status — `status.phrase.com`.
 *
 * Verified 2026-10-06: a real Atlassian Statuspage (`page.id` `1h2gj9cpnbtp`,
 * `page.name` "Phrase", `status.indicator` schema), served directly with no redirect.
 * It rolls up SEVERAL products (Strings, TMS, Orchestrator, Portal, IDM, Language AI),
 * each in an EU and a US group, so the top-level indicator is not a statement about
 * this app. The verdict comes from the single `API` component inside the connection's
 * own region's "Phrase Strings (EU|US)" group; the group's other components (Translation
 * center, Repo sync, OTA, Ordering, In-context editor, Email delivery) are reported but
 * can only degrade, because a workflow's API calls do not depend on them.
 */
export const STATUS_URL = "https://status.phrase.com/api/v2/summary.json";
export const PAGE_ID = "1h2gj9cpnbtp";

/** Group id of "Phrase Strings (EU|US)" and the id of its `API` component. */
export const STRINGS: Record<Region, { group: string; api: string }> = {
  eu: { group: "wyzf68n5zv2l", api: "81swzdq8nq9p" },
  us: { group: "yvw79h4g4fl4", api: "m0yjp8hx3jkd" },
};

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
  group_id?: string | null;
}

interface StatusSummary {
  page?: { id?: string; name?: string };
  components?: StatusComponent[];
  status?: { indicator?: string };
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
  title: "Phrase Strings status",
  description:
    "The API component of the connection's own data centre (EU or US) on status.phrase.com; " +
    "other Strings components are reported but only ever degrade.",
  kind: "service",
  scope: "connection",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.phrase.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const region = regionFromConnection(ctx.connection);
    const ids = STRINGS[region];
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body?.page) {
      return { state: "unknown", message: "Status page returned an unreadable body" };
    }
    if (body.page.id !== PAGE_ID) {
      return { state: "unknown", message: "status page no longer self-identifies as Phrase's" };
    }

    const group = (body.components ?? []).filter((c) => c.group_id === ids.group && c.name);
    const api = group.find((c) => c.id === ids.api);
    if (!api) {
      return {
        state: "unknown",
        message: `status page has no Strings (${region.toUpperCase()}) API component`,
      };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const c of group) {
      const raw = mapComponentStatus(c.status);
      const state: HealthState = c.id === ids.api || raw === "ok" ? raw : "degraded";
      components[c.id!] = state === "ok"
        ? { state, message: c.name }
        : { state, message: `${c.name}: ${c.status}` };
    }

    const state = mapComponentStatus(api.status);
    return {
      state,
      message: state === "ok"
        ? undefined
        : `Phrase Strings (${region.toUpperCase()}) API: ${api.status}`,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
