import type { ActionDefinition } from "@w6w/types";
import { AtlasClient, projectId, query } from "../lib/client.ts";
import { PAGE_PARAMS, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /api/atlas/v2/groups/{groupId}/clusters` — the dedicated clusters in a
 * project.
 *
 * ## This does not list every cluster in the project
 *
 * **Flex clusters are a separate endpoint.** `/flexClusters` (from version
 * `2024-11-13`) holds the tier that replaced M2 and M5, and nothing about this
 * response says they exist. A workflow auditing "every cluster" from here
 * misses them entirely, and the omission is invisible — the list is not
 * truncated, it is complete for a category the caller did not know was a
 * category. `flex-cluster-list` is the other half.
 *
 * ## `stateName` is the field that decides whether anything else will work
 *
 * `IDLE` is the only state that accepts changes. `CREATING`, `UPDATING`,
 * `REPAIRING` and `DELETING` all answer 409 to a modification, and a cluster
 * spends **minutes** in `UPDATING` after any change — so "change it, then
 * change it again" fails on the second call unless something waited.
 *
 * ## `paused` is the cost lever
 *
 * A paused cluster keeps its data and its configuration and stops billing for
 * compute. This action counts them because "which of these are asleep" is the
 * question behind most scheduled workflows against this API.
 */
const action: ActionDefinition = {
  key: "cluster-list",
  type: "search",
  resource: "cluster",
  title: "List clusters",
  description:
    "A project's dedicated clusters. FLEX clusters are a separate endpoint and are NOT in here — " +
    "an audit built on this list silently misses them.",
  params: [PROJECT_PARAM, ...PAGE_PARAMS],
  output: [
    { key: "clusters", type: "array", label: "The clusters" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "names", type: "array", label: "Just the names, which are the ids" },
    {
      key: "pausedCount",
      type: "number",
      label: "How many are paused, and so not billing compute",
    },
    { key: "busyCount", type: "number", label: "How many are not IDLE, and will refuse a change" },
    { key: "totalCount", type: "number", label: "Across all pages" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = projectId(p.projectId);

    const { results, totalCount } = await new AtlasClient(ctx).list<{
      name?: string;
      stateName?: string;
      paused?: boolean;
      mongoDBVersion?: string;
      clusterType?: string;
    }>(`/api/atlas/v2/groups/${id}/clusters`, {
      // The current cluster shape. An older date returns the legacy one, with
      // different sizing fields.
      version: "2024-08-05",
      query: query({
        itemsPerPage: Math.min(500, Math.max(1, Number(p.itemsPerPage ?? 100))),
        pageNum: Math.max(1, Number(p.pageNum ?? 1)),
      }),
    });

    const pausedCount = results.filter((cluster) => cluster?.paused === true).length;
    const busyCount =
      results.filter((cluster) => cluster?.stateName !== undefined && cluster.stateName !== "IDLE")
        .length;

    ctx.log("info", "listed Atlas clusters", {
      count: results.length,
      pausedCount,
      busyCount,
    });

    return {
      clusters: results,
      count: results.length,
      names: results.map((cluster) => cluster?.name).filter(Boolean),
      pausedCount,
      busyCount,
      totalCount,
    };
  },
};

export default action;
