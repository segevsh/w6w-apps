/**
 * Is NetSuite up? — `status.netsuite.com`, read 2026-10-05.
 *
 * ## The page is real
 *
 * An Atlassian Statuspage: `/api/v2/summary.json` answers 200 `application/json` in the v2 schema
 * (`status.indicator` present, 96,280 bytes), `page` = `{id: "jbt6k9g57c34", name: "Oracle NetSuite
 * Service"}`. (`/history.atom` redirects to `/inactive.atom` and 404s — there is no feed, so this
 * check reads the JSON itself. `netsuite.statuspage.io` answers 401, a private decoy.)
 *
 * ## It is not one status — it is 39 data centers
 *
 * The page carries 284 components: nine product groups (Application UI, Asynchronous Services,
 * Email, SuiteAnalytics Connect, SuiteAnswers, SuiteCommerce, **SuiteTalk**, SuiteProjects Pro,
 * SuitePeople Payroll), and each group repeats one component per data center ("US Ashburn 1",
 * "EU Frankfurt 1", …) — so a component is only identifiable as (group, name). The REST API is the
 * `SuiteTalk` group, and which data center a given account lives in is not something this app can
 * know: the account-specific hostname deliberately hides it. The page-level indicator would turn
 * degraded for a SuiteCommerce incident in Tokyo.
 *
 * So the check reads the `SuiteTalk` group's components only and reports what it can honestly say:
 * `ok` when every data center is operational, otherwise `degraded` naming the affected ones — and
 * **never `down`**, because one data center failing says nothing certain about this account.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.netsuite.com/api/v2/summary.json";
export const PAGE_ID = "jbt6k9g57c34";
export const GROUP_ID = "26btvslh6zjv";
export const GROUP_NAME = "SuiteTalk";

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
}

export function mapComponentStatus(status: string | undefined): HealthState {
  switch (status) {
    case "operational":
      return "ok";
    case "degraded_performance":
    case "partial_outage":
    case "major_outage":
    case "under_maintenance":
      return "degraded";
    default:
      return "unknown";
  }
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "NetSuite SuiteTalk status",
  description:
    "The SuiteTalk (web services) group on status.netsuite.com, across data centers. Reports " +
    "degraded — never down — because the account's own data center is not knowable.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.netsuite.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };
    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };
    if (body.page?.id !== PAGE_ID) {
      return { state: "unknown", message: "status page no longer identifies as NetSuite's" };
    }

    const components = body.components ?? [];
    const group = components.find((c) =>
      c?.group === true && (c.id === GROUP_ID || c.name === GROUP_NAME)
    );
    if (!group) return { state: "unknown", message: "Status page has no SuiteTalk group" };

    const members = components.filter((c) => c?.group !== true && c?.group_id === group.id);
    if (members.length === 0) {
      return { state: "unknown", message: "SuiteTalk group has no data-center components" };
    }
    const affected = members.filter((c) => c.status !== "operational");
    if (affected.length === 0) return { state: "ok", ttlSeconds: 60 };

    const states = new Set(affected.map((c) => mapComponentStatus(c.status)));
    const worst: HealthState = states.has("degraded") ? "degraded" : "unknown";
    return {
      state: worst,
      message: `SuiteTalk affected in ${affected.length} of ${members.length} data centers: ` +
        affected.slice(0, 8).map((c) => `${c.name} (${c.status})`).join(", ") +
        (affected.length > 8 ? ", …" : ""),
      ttlSeconds: 60,
    };
  },
};

export default service;
