import type { ActionDefinition } from "@w6w/types";
import { FivetranClient, query } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/connections` — every pipeline, and which of them are broken.
 *
 * The sweep behind a morning check. Fivetran's dashboard shows this, and a
 * workflow that reads it can act on it: page the owner of a broken connection,
 * open a ticket, or simply refuse to run a report built on stale data.
 *
 * This action separates the three states worth separating rather than making a
 * caller filter an array:
 *
 *   - **broken** — not syncing, will not resume without a person;
 *   - **warning** — syncing, and the data is incomplete;
 *   - **paused** — deliberate, and not a fault.
 *
 * That last distinction is why a naive "count the unhealthy ones" report is
 * noise: a paused connection is somebody's decision, and treating it as an
 * incident trains people to ignore the report.
 *
 * `group_id` narrows to one destination — see `group-list` for why a group and
 * a destination are the same thing.
 */
const action: ActionDefinition = {
  key: "connection-list",
  type: "read",
  resource: "connection",
  title: "List connections",
  description:
    "Every pipeline, with the broken, warning and paused ones separated. A paused connection is " +
    "somebody's decision rather than an incident.",
  params: [
    {
      key: "groupId",
      label: "Group ID",
      type: "string",
      default: "",
      hint: "Narrow to one destination — a group and a destination are the same object.",
    },
    {
      key: "schema",
      label: "Schema",
      type: "string",
      default: "",
      hint: "Exact match on the destination schema name; partial matches are not supported.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "connections", type: "array", label: "Connections" },
    { key: "count", type: "number", label: "Connections returned" },
    { key: "broken", type: "array", label: "Not syncing, and will not resume on their own" },
    { key: "warning", type: "array", label: "Syncing, with incomplete data" },
    { key: "pausedCount", type: "number", label: "Paused deliberately — not a fault" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new FivetranClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));

    const page = await client.pageAll<{
      id?: string;
      schema?: string;
      paused?: boolean;
      status?: { setup_state?: string; warnings?: unknown[] };
    }>(
      "/v1/connections",
      {
        query: query({ group_id: p.groupId, schema: p.schema }),
      },
      want,
      Math.max(1, Number(p.maxPages ?? 20)),
    );

    const name = (c: { id?: string; schema?: string }) => String(c?.schema ?? c?.id ?? "");
    const broken = page.items
      .filter((c) => c?.status?.setup_state === "broken")
      .map(name);
    const warning = page.items
      .filter((c) => c?.status?.setup_state !== "broken" && (c?.status?.warnings ?? []).length > 0)
      .map(name);
    const pausedCount = page.items.filter((c) => c?.paused === true).length;

    ctx.log("info", "read Fivetran connections", {
      count: page.items.length,
      broken: broken.length,
    });
    return {
      connections: page.items,
      count: page.items.length,
      broken,
      warning,
      pausedCount,
    };
  },
};

export default action;
