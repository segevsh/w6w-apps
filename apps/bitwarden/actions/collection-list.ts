import type { ActionDefinition } from "@w6w/types";
import { BitwardenClient } from "../lib/client.ts";
import { items } from "../lib/shape.ts";

const action: ActionDefinition = {
  key: "collection-list",
  type: "read",
  resource: "collection",
  title: "List collections",
  description:
    "Every collection in the organization with the groups assigned to each. The spec documents NO pagination parameter and no continuation token for this endpoint (the prose guide claims one; the OpenAPI document does not), so this returns whatever the API sends in one response.",
  params: [],
  output: [
    { key: "collections", type: "array", label: "Collections" },
    { key: "count", type: "number", label: "How many were returned" },
  ],

  async execute(input, ctx) {
    void input;
    const page = await new BitwardenClient(ctx).request("/collections");
    const collections = items(page);
    return { collections, count: collections.length };
  },
};

export default action;
