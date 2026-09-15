import type { ActionDefinition } from "@w6w/types";
import { flattenMany, type JsonApiDocument, NationBuilderClient } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  listId: string;
  pageSize?: number;
  pageNumber?: number;
}

/** `GET /api/v2/lists/{id}/signups` — confirmed against the vendor's OpenAPI spec. */
const listPeopleList: ActionDefinition<Input> = {
  key: "list-people-list",
  type: "search",
  resource: "list",
  title: "List People on a List",
  description: "List the people on a custom list.",
  params: [
    { key: "listId", label: "List ID", type: "string", required: true },
    ...pagination,
  ],
  output: [{ key: "items", type: "array", label: "People" }],

  async execute(input, ctx) {
    const res = await new NationBuilderClient(ctx).request<JsonApiDocument>(
      `/lists/${encodeURIComponent(input.listId)}/signups`,
      { query: { "page[size]": input.pageSize, "page[number]": input.pageNumber } },
    );
    return { items: flattenMany(Array.isArray(res.data) ? res.data : []) };
  },
};

export default listPeopleList;
