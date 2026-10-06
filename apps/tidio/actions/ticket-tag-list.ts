import type { ActionDefinition } from "@w6w/types";
import { call } from "../lib/client.ts";

/** `GET /tickets/tags` — a bare array `[{id, name}]`, sorted by name. */
const ticketTagList: ActionDefinition<Record<string, never>> = {
  key: "ticket-tag-list",
  type: "read",
  resource: "ticket",
  title: "List Ticket Tags",
  description: "List the project's ticket tags (ID and name), sorted by name.",
  params: [],
  output: [
    { key: "items", type: "array", label: "Tags [{id, name}]" },
    { key: "count", type: "number", label: "Number of tags" },
  ],
  async execute(_input, ctx) {
    const body = await call(ctx, "GET", "/tickets/tags");
    const items = Array.isArray(body) ? body : [];
    return { items, count: items.length };
  },
};

export default ticketTagList;
