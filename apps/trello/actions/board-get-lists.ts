import type { ActionDefinition } from "@w6w/types";
import { TrelloClient, unset } from "../lib/client.ts";

interface Input {
  id: string;
  filter?: string;
  fields?: string;
}

const boardGetLists: ActionDefinition<Input, unknown[]> = {
  key: "board-get-lists",
  type: "read",
  resource: "board",
  title: "Get Board Lists",
  description: "List the columns (lists) on a board.",
  params: [
    { key: "id", label: "Board ID", type: "string", required: true },
    {
      key: "filter",
      label: "Filter",
      type: "select",
      default: "open",
      options: [
        { value: "open", label: "Open" },
        { value: "closed", label: "Archived" },
        { value: "all", label: "All" },
      ],
    },
    { key: "fields", label: "Fields", type: "string" },
  ],
  output: [{ key: "", type: "array", label: "Lists" }],

  execute(input, ctx) {
    return new TrelloClient(ctx).request<unknown[]>(
      `/boards/${encodeURIComponent(input.id)}/lists`,
      { query: { filter: unset(input.filter), fields: unset(input.fields) } },
    );
  },
};

export default boardGetLists;
