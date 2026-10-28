import type { ActionDefinition } from "@w6w/types";
import { TrelloClient } from "../lib/client.ts";

const checklistGet: ActionDefinition<{ id: string }> = {
  key: "checklist-get",
  type: "read",
  resource: "checklist",
  title: "Get Checklist",
  description: "Fetch a checklist and its items.",
  params: [{ key: "id", label: "Checklist ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Checklist ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "checkItems", type: "array", label: "Items" },
  ],

  execute(input, ctx) {
    return new TrelloClient(ctx).request(`/checklists/${encodeURIComponent(input.id)}`);
  },
};

export default checklistGet;
