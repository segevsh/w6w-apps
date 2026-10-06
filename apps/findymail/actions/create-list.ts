import type { ActionDefinition } from "@w6w/types";
import { FindymailClient } from "../lib/client.ts";

interface Input {
  name: string;
}

const createList: ActionDefinition<Input> = {
  key: "create-list",
  type: "perform",
  resource: "list",
  title: "Create Contact List",
  description: "Create a new contact list.",
  idempotent: false,
  params: [{
    "key": "name",
    "label": "Name",
    "type": "string",
    "required": true,
    "hint": "Name of the list.",
  }],
  output: [{ "key": "list", "type": "object", "label": "The created list" }],

  async execute(input, ctx) {
    return await new FindymailClient(ctx).request("POST", "/api/lists", {
      body: { name: input.name },
    });
  },
};

export default createList;
