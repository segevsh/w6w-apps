import type { ActionDefinition } from "@w6w/types";
import { AtlasClient, projectId, query } from "../lib/client.ts";
import { PAGE_PARAMS, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /api/atlas/v2/groups/{groupId}/flexClusters` — the other half of the
 * cluster list.
 *
 * ## Why this is a separate action rather than a flag
 *
 * Flex clusters live at their own path and exist **only from resource version
 * `2024-11-13`** — measured in MongoDB's own OpenAPI document, where the whole
 * family appears at that version and nowhere earlier. They are not in
 * `/clusters`, and `/clusters` gives no indication that another category
 * exists.
 *
 * So an inventory built the obvious way is quietly incomplete, and the error
 * that would reveal it never comes: the response is a valid, complete list of
 * a different set of things. This action makes the second half explicit, and
 * `cluster-list` says so in its own description.
 *
 * They replaced the M2 and M5 shared tiers, and they bill on usage rather than
 * on an instance size — which is also why they have no `instanceSize` to read.
 */
const action: ActionDefinition = {
  key: "flex-cluster-list",
  type: "search",
  resource: "cluster",
  title: "List flex clusters",
  description:
    "The flex tier, which `cluster-list` does NOT return — a separate endpoint that exists only " +
    "from resource version 2024-11-13. Between the two you have the project's real inventory.",
  params: [PROJECT_PARAM, ...PAGE_PARAMS],
  output: [
    { key: "clusters", type: "array", label: "The flex clusters" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "names", type: "array", label: "Just the names" },
    { key: "totalCount", type: "number", label: "Across all pages" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = projectId(p.projectId);

    const { results, totalCount } = await new AtlasClient(ctx).list<{
      name?: string;
      stateName?: string;
      mongoDBVersion?: string;
    }>(`/api/atlas/v2/groups/${id}/flexClusters`, {
      // The only version this family exists at. An older date is a 404 that
      // says nothing about versions.
      version: "2024-11-13",
      query: query({
        itemsPerPage: Math.min(500, Math.max(1, Number(p.itemsPerPage ?? 100))),
        pageNum: Math.max(1, Number(p.pageNum ?? 1)),
      }),
    });

    return {
      clusters: results,
      count: results.length,
      names: results.map((cluster) => cluster?.name).filter(Boolean),
      totalCount,
    };
  },
};

export default action;
