import type { ActionDefinition } from "@w6w/types";
import { asText, LodgifyClient } from "../lib/client.ts";

/**
 * List deleted properties. Wraps `GET /v2/deletedproperties` (GetAllDeletedAsync); the
 * only query parameter is `deletedSince`. The response is a bare array of property ids
 * (integers).
 */
const action: ActionDefinition = {
  key: "list-deleted-properties",
  type: "read",
  resource: "property",
  title: "List deleted properties",
  description: "List the ids of properties deleted since a date, to keep a synced copy tidy.",
  params: [
    {
      key: "deletedSince",
      label: "Deleted since",
      type: "datetime",
      hint: "Only include properties deleted since this date.",
    },
  ],
  output: [{ key: "items", type: "array", label: "Deleted property IDs" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    return await new LodgifyClient(ctx).list("/v2/deletedproperties", {
      query: { deletedSince: asText(p.deletedSince) },
    });
  },
};

export default action;
