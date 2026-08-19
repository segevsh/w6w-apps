import type { ActionDefinition } from "@w6w/types";
import { AtlasClient, projectId, query } from "../lib/client.ts";
import { PAGE_PARAMS, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /api/atlas/v2/groups/{groupId}/alerts` — what Atlas is unhappy about.
 *
 * ## Open alerts are the useful ones, and they are not the default
 *
 * `status` is `OPEN`, `TRACKING` or `CLOSED`. Unfiltered, the list is mostly
 * history: alerts that fired and resolved themselves, going back a long way.
 * A workflow asking "is anything wrong now" wants `OPEN`, which is why this
 * action defaults to it — Atlas does not.
 *
 * `TRACKING` is the one people miss: it means the condition has been met and
 * the alert is inside its notification delay, so it is genuinely happening and
 * has not been announced yet.
 *
 * ## An alert exists because somebody configured it
 *
 * Atlas ships default alert configurations, and a project where somebody
 * turned them off is a project where an empty list means nothing. So this
 * reports the configuration count alongside — zero open alerts and zero
 * configurations is silence, not health.
 */
const action: ActionDefinition = {
  key: "alert-list",
  type: "read",
  resource: "alert",
  title: "List alerts",
  description:
    "A project's alerts, OPEN by default because unfiltered the list is mostly resolved history. " +
    "`TRACKING` means the condition is met and inside its notification delay.",
  params: [
    PROJECT_PARAM,
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "OPEN",
      options: [
        { value: "OPEN", label: "Open — happening now" },
        { value: "TRACKING", label: "Tracking — met, not yet announced" },
        { value: "CLOSED", label: "Closed — resolved" },
        { value: "", label: "All" },
      ],
    },
    ...PAGE_PARAMS,
  ],
  output: [
    { key: "alerts", type: "array", label: "The alerts" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "openCount", type: "number", label: "How many are OPEN" },
    { key: "trackingCount", type: "number", label: "How many are met but unannounced" },
    { key: "eventTypes", type: "array", label: "The distinct conditions that fired" },
    { key: "totalCount", type: "number", label: "Across all pages" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = projectId(p.projectId);

    const { results, totalCount } = await new AtlasClient(ctx).list<{
      id?: string;
      status?: string;
      eventTypeName?: string;
      created?: string;
    }>(`/api/atlas/v2/groups/${id}/alerts`, {
      query: query({
        status: p.status === undefined ? "OPEN" : p.status,
        itemsPerPage: Math.min(500, Math.max(1, Number(p.itemsPerPage ?? 100))),
        pageNum: Math.max(1, Number(p.pageNum ?? 1)),
      }),
    });

    const openCount = results.filter((alert) => alert?.status === "OPEN").length;
    const trackingCount = results.filter((alert) => alert?.status === "TRACKING").length;
    const eventTypes = [
      ...new Set(results.map((alert) => alert?.eventTypeName).filter(Boolean) as string[]),
    ].sort();

    if (openCount > 0) {
      ctx.log("warn", "this Atlas project has open alerts", { openCount, trackingCount });
    }

    return {
      alerts: results,
      count: results.length,
      openCount,
      trackingCount,
      eventTypes,
      totalCount,
    };
  },
};

export default action;
