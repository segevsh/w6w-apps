import type { ActionDefinition } from "@w6w/types";
import { FivetranClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/groups/{id}/connections` — everything feeding one warehouse.
 *
 * The same rows `connection-list` returns with a `group_id` filter, reached
 * from the other direction. It is the more natural call when the warehouse is
 * the subject: *before* rebuilding a destination, pausing for maintenance, or
 * working out what a migration will touch, the question is "what writes here",
 * and this asks it directly.
 *
 * For an account with a production and a staging warehouse, this is also the
 * check that catches the mistake worth catching — a connection pointed at the
 * wrong one.
 */
const action: ActionDefinition = {
  key: "group-connection-list",
  type: "read",
  resource: "group",
  title: "List a group's connections",
  description: "Everything feeding one warehouse — the natural question before a migration or a " +
    "maintenance window, and the check that finds a connection pointed at the wrong environment.",
  params: [
    {
      key: "groupId",
      label: "Group ID",
      type: "string",
      required: true,
      default: "",
      hint: "From `group-list`. The same id as the destination's.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "connections", type: "array", label: "Connections writing into this destination" },
    { key: "count", type: "number", label: "Connections returned" },
    { key: "pausedCount", type: "number", label: "Of those, how many are paused" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const groupId = String(p.groupId ?? "").trim();
    if (!groupId) throw new Error("`groupId` is required");

    const client = new FivetranClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));
    const page = await client.pageAll<{ paused?: boolean }>(
      `/v1/groups/${encodeURIComponent(groupId)}/connections`,
      {},
      want,
      Math.max(1, Number(p.maxPages ?? 20)),
    );

    return {
      connections: page.items,
      count: page.items.length,
      pausedCount: page.items.filter((c) => c?.paused === true).length,
    };
  },
};

export default action;
