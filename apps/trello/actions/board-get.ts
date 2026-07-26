import type { ActionDefinition } from "@w6w/types";
import { TrelloClient, unset } from "../lib/client.ts";

interface Input {
  id: string;
  fields?: string;
}

const boardGet: ActionDefinition<Input> = {
  key: "board-get",
  type: "read",
  resource: "board",
  title: "Get Board",
  description: "Fetch a board by id.",
  params: [
    { key: "id", label: "Board ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      hint: "Comma-separated field list, or `all`. Defaults to Trello's standard set.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Board ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "desc", type: "string", label: "Description" },
    { key: "closed", type: "boolean", label: "Archived" },
    { key: "url", type: "string", label: "URL" },
  ],

  execute(input, ctx) {
    return new TrelloClient(ctx).request(`/boards/${encodeURIComponent(input.id)}`, {
      query: { fields: unset(input.fields) },
    });
  },
};

export default boardGet;
