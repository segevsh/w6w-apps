import type { ActionDefinition } from "@w6w/types";
import { FivetranClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/groups` — the destinations, under their other name.
 *
 * ## A group *is* a destination
 *
 * This is the single most confusing thing in Fivetran's API, and it is
 * confusing in the API's own documentation: this endpoint's official summary is
 * *"List All Destinations within Account"*. A **group** is the container that
 * connections belong to; a **destination** is the warehouse that group writes
 * into. They are the same object with the same id, seen from two sides.
 *
 * So `group-list` and `destination-list` return matching ids, and
 * `connection-list`'s `group_id` filter is asking "which warehouse". Both names
 * exist here because both appear in the API and in Fivetran's own UI, and a
 * workflow written against one will be read by somebody who knows the other.
 *
 * Most accounts have one group. Several usually means separate environments —
 * a production warehouse and a staging one — which is exactly when getting the
 * id right matters.
 */
const action: ActionDefinition = {
  key: "group-list",
  type: "read",
  resource: "group",
  title: "List groups",
  description:
    "The destinations, under Fivetran's other name for them — a group IS a destination, same " +
    "object and same id. Several usually means separate environments.",
  params: [...LIST_PARAMS],
  output: [
    { key: "groups", type: "array", label: "Groups, which are destinations" },
    { key: "count", type: "number", label: "Groups returned" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new FivetranClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));
    const page = await client.pageAll(
      "/v1/groups",
      {},
      want,
      Math.max(1, Number(p.maxPages ?? 20)),
    );
    return { groups: page.items, count: page.items.length };
  },
};

export default action;
