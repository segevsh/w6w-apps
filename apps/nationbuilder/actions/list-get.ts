import type { ActionDefinition } from "@w6w/types";
import { flatten, type JsonApiDocument, NationBuilderClient } from "../lib/client.ts";

interface Input {
  listId: string;
}

/** `GET /api/v2/lists/{id}` — confirmed against the vendor's OpenAPI spec. */
const listGet: ActionDefinition<Input> = {
  key: "list-get",
  type: "read",
  resource: "list",
  title: "Get List",
  description: "Fetch a custom list by id.",
  params: [{ key: "listId", label: "List ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "List ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const res = await new NationBuilderClient(ctx).request<JsonApiDocument>(
      `/lists/${encodeURIComponent(input.listId)}`,
    );
    return flatten(Array.isArray(res.data) ? undefined : res.data);
  },
};

export default listGet;
