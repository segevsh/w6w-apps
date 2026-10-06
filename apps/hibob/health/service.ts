/**
 * Is Bob's public API up?
 *
 * Bob publishes an Atlassian Statuspage (page id `4427wk0x9t9k`, name "HiBob",
 * self-declared url `https://status.hibob.io`). Checked 2026-10-06:
 *
 *  - `status.hibob.io/api/v2/summary.json` answers 200 directly with the
 *    Statuspage v2 schema (`status.indicator`, `components[]`); the identical
 *    document is served from `hibob.statuspage.io`. `status.hibob.com` does not
 *    resolve, so the declared host is the page's own: `status.hibob.io`.
 *  - It is a roll-up of ~45 components across Core HR, Time, Talent, Payroll,
 *    Hiring and more, so the page-level indicator is NOT a statement about the
 *    API. There is a dedicated **`Public API`** component (id `6q9wcj8f00bt`,
 *    inside group `l72k00m00jbk`) — that is the one this check judges. Time
 *    Off, Tasks and Docs have components too, but they are the modules behind
 *    their own endpoints; the Public API component is the gateway for all calls.
 *
 * Verdict: the Public API component's status. Page-level incidents are surfaced
 * in the message only.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.hibob.io/api/v2/summary.json";
export const PUBLIC_API_COMPONENT_ID = "6q9wcj8f00bt";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatusComponent[];
  incidents?: Array<{ name?: string }>;
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

const service: HealthCheckDefinition = {
  key: "service",
  title: "Bob Public API status",
  description:
    "The 'Public API' component of status.hibob.io (Atlassian Statuspage). The page also " +
    "covers payroll, hiring and other modules; those do not affect this verdict.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.hibob.io"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body || !Array.isArray(body.components)) {
      return { state: "unknown", message: "Status page returned an unreadable body" };
    }
    if (body.page?.id !== "4427wk0x9t9k") {
      return { state: "unknown", message: "status page no longer self-identifies as Bob's" };
    }

    const api = body.components.find((c) => c.id === PUBLIC_API_COMPONENT_ID && c.group !== true);
    if (!api) {
      return { state: "unknown", message: "Status page has no 'Public API' component" };
    }

    const state = mapComponentStatus(api.status);
    const notes: string[] = [];
    if (state !== "ok") notes.push(`Public API: ${api.status}`);
    const open = body.incidents?.length ?? 0;
    if (open > 0) notes.push(`${open} open incident(s) on the status page`);
    return {
      state,
      message: notes.length ? notes.join("; ") : undefined,
      components: {
        [PUBLIC_API_COMPONENT_ID]: {
          state,
          message: state === "ok" ? api.name : `${api.name}: ${api.status}`,
        },
      },
      ttlSeconds: 60,
    };
  },
};

export default service;
