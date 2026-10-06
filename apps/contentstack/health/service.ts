/**
 * Is Contentstack up? — Atlassian Statuspage (`status.contentstack.com`),
 * read per region.
 *
 * Verified 2026-10-06: `GET /api/v2/summary.json` answers 200 with
 * `page.name = "Contentstack"`, `page.id = "v2x965mxjrv3"` and the Statuspage
 * schema (`status.indicator`, `components[]`). The page rolls up many products
 * (Delivery, Image Delivery, GraphQL, Launch, Personalize, AgentOS, Lytics …),
 * so the page-level indicator is never used: an outage of a product this app
 * does not call must not mark it down.
 *
 * Components are grouped by cloud region — `Amazon Web Services US Region`,
 * `… EU Region`, `… AU Region`, `Microsoft Azure US Region`, `… EU Region`,
 * `Google Cloud Platform US Region`, `… EU Region` — and each group has one
 * child named `Content Management API`, which is exactly what this app calls.
 * Only the child of THIS connection's region group is watched, resolved
 * through `group_id` (the same child name repeats in every group). The page
 * also carries a few ungrouped, legacy-looking `<Cloud> - Content Management
 * API` components; they are ignored in favour of the grouped ones.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { type Region, regionFromConnection } from "../lib/client.ts";

const STATUS_HOST = "status.contentstack.com";

/** Region -> the group name the status page uses. */
export const GROUP_NAME: Record<Region, string> = {
  "na": "Amazon Web Services US Region",
  "eu": "Amazon Web Services EU Region",
  "au": "Amazon Web Services AU Region",
  "azure-na": "Microsoft Azure US Region",
  "azure-eu": "Microsoft Azure EU Region",
  "gcp-na": "Google Cloud Platform US Region",
  "gcp-eu": "Google Cloud Platform EU Region",
};

const WATCHED_COMPONENT = "Content Management API";

const STATES: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

interface Component {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
  group_id?: string | null;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Contentstack platform status",
  description:
    "The Content Management API component for THIS connection's region on status.contentstack.com. " +
    "Reads the Connection for the region; sends no credential.",
  kind: "service",
  covers: ["*"],
  scope: "connection",
  credential: "context",
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const groupName = GROUP_NAME[regionFromConnection(ctx.connection)];

    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails says nothing about the vendor.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as
      | { page?: { name?: string }; components?: Component[] }
      | null;
    if (body?.page?.name !== "Contentstack" || !Array.isArray(body.components)) {
      return { state: "unknown", message: "status page did not identify as Contentstack" };
    }

    const group = body.components.find((c) => c.group === true && c.name === groupName);
    if (!group?.id) return { state: "unknown", message: `status page names no "${groupName}"` };

    const cma = body.components.find((c) =>
      c.group !== true && c.group_id === group.id && c.name === WATCHED_COMPONENT
    );
    if (!cma) {
      return {
        state: "unknown",
        message: `status page names no "${WATCHED_COMPONENT}" under ${groupName}`,
      };
    }

    const state = STATES[String(cma.status)] ?? "unknown";
    return {
      state,
      message: state === "ok" ? `${groupName}: ${WATCHED_COMPONENT} operational` : cma.status,
      components: { [WATCHED_COMPONENT]: { state, message: cma.status } },
      ttlSeconds: 60,
    };
  },
};

export default service;
