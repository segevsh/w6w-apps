import type { ActionDefinition } from "@w6w/types";
import { TrelloClient, unset } from "../lib/client.ts";

interface Input {
  id: string;
  fields?: string;
}

const listGet: ActionDefinition<Input> = {
  key: "list-get",
  type: "read",
  resource: "list",
  title: "Get List",
  description: "Fetch a list by id.",
  params: [
    { key: "id", label: "List ID", type: "string", required: true },
    { key: "fields", label: "Fields", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "List ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "closed", type: "boolean", label: "Archived" },
  ],

  execute(input, ctx) {
    return new TrelloClient(ctx).request(`/lists/${encodeURIComponent(input.id)}`, {
      query: { fields: unset(input.fields) },
    });
  },
};

export default listGet;
