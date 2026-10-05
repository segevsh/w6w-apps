import type { ActionDefinition } from "@w6w/types";
import { BitwardenClient } from "../lib/client.ts";
import { items } from "../lib/shape.ts";

const action: ActionDefinition = {
  key: "group-list",
  type: "read",
  resource: "group",
  title: "List groups",
  description:
    "Every group in the organization with its collection assignments. No pagination parameter is documented for this endpoint.",
  params: [],
  output: [
    { key: "groups", type: "array", label: "Groups" },
    { key: "count", type: "number", label: "How many were returned" },
  ],

  async execute(input, ctx) {
    void input;
    const groups = items(await new BitwardenClient(ctx).request("/groups"));
    return { groups, count: groups.length };
  },
};

export default action;
