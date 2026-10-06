import type { ActionDefinition } from "@w6w/types";
import { FindymailClient } from "../lib/client.ts";

type Input = Record<string, never>;

const listLists: ActionDefinition<Input> = {
  key: "list-lists",
  type: "read",
  resource: "list",
  title: "List Contact Lists",
  description: "List the contact lists of the authenticated user.",
  params: [],
  output: [{ "key": "lists", "type": "array", "label": "Contact lists" }],

  async execute(_input, ctx) {
    return await new FindymailClient(ctx).request("GET", "/api/lists");
  },
};

export default listLists;
