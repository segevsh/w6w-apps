import type { ActionDefinition } from "@w6w/types";
import { FindymailClient } from "../lib/client.ts";

type Input = Record<string, never>;

const listExclusionLists: ActionDefinition<Input> = {
  key: "list-exclusion-lists",
  type: "read",
  resource: "exclusion-list",
  title: "List Exclusion Lists",
  description:
    "List every Intellimatch exclusion list the user owns or that is shared with their team.",
  params: [],
  output: [{ "key": "lists", "type": "array", "label": "Exclusion lists" }],

  async execute(_input, ctx) {
    return await new FindymailClient(ctx).request("GET", "/api/intellimatch/exclusion-lists");
  },
};

export default listExclusionLists;
