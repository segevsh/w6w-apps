import type { ActionDefinition } from "@w6w/types";
import { AtlasClient, projectId, query } from "../lib/client.ts";
import { PAGE_PARAMS, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /api/atlas/v2/groups/{groupId}/processes` — the individual `mongod` and
 * `mongos` processes behind the clusters.
 *
 * ## This is the level at which a replica set is visible
 *
 * A cluster is a name and a connection string. Underneath it are three or more
 * processes, one per node, each with its own hostname, port, version and
 * **`typeName`** — `REPLICA_PRIMARY`, `REPLICA_SECONDARY`, `SHARD_MONGOS`.
 * That is the only place this API says which node is currently primary.
 *
 * Worth knowing for two reasons: a primary election during a scaling operation
 * is visible here and nowhere else, and a node running a different
 * `version` from its peers is a rolling upgrade in progress.
 *
 * ## The `id` here is what the metrics endpoints take
 *
 * `{hostname}:{port}` — measurements, disk statistics and slow-query logs are
 * all addressed per process rather than per cluster, so listing them is the
 * first step of any monitoring workflow that goes deeper than an alert.
 */
const action: ActionDefinition = {
  key: "process-list",
  type: "read",
  resource: "process",
  title: "List cluster processes",
  description:
    "The individual nodes behind a project's clusters, with which is PRIMARY — the only place " +
    "this API says so. Their ids are what the per-node metrics endpoints take.",
  params: [PROJECT_PARAM, ...PAGE_PARAMS],
  output: [
    { key: "processes", type: "array", label: "The processes" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "ids", type: "array", label: "hostname:port, as the metrics endpoints want them" },
    { key: "primaries", type: "array", label: "The ids currently serving as primary" },
    { key: "versions", type: "array", label: "The distinct versions running" },
    { key: "mixedVersions", type: "boolean", label: "True during a rolling upgrade" },
    { key: "totalCount", type: "number", label: "Across all pages" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = projectId(p.projectId);

    const { results, totalCount } = await new AtlasClient(ctx).list<{
      id?: string;
      typeName?: string;
      version?: string;
      hostname?: string;
      port?: number;
      userAlias?: string;
    }>(`/api/atlas/v2/groups/${id}/processes`, {
      query: query({
        itemsPerPage: Math.min(500, Math.max(1, Number(p.itemsPerPage ?? 100))),
        pageNum: Math.max(1, Number(p.pageNum ?? 1)),
      }),
    });

    const versions = [
      ...new Set(results.map((process) => process?.version).filter(Boolean) as string[]),
    ].sort();

    return {
      processes: results,
      count: results.length,
      ids: results.map((process) => process?.id).filter(Boolean),
      primaries: results
        .filter((process) => process?.typeName === "REPLICA_PRIMARY")
        .map((process) => process?.id)
        .filter(Boolean),
      versions,
      // Several versions at once is a rolling upgrade, not a misconfiguration.
      mixedVersions: versions.length > 1,
      totalCount,
    };
  },
};

export default action;
