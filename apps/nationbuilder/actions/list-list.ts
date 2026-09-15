import type { ActionDefinition } from "@w6w/types";
import { flattenMany, type JsonApiDocument, NationBuilderClient } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  pageSize?: number;
  pageNumber?: number;
}

/** `GET /api/v2/lists` — confirmed against the vendor's OpenAPI spec. */
const listList: ActionDefinition<Input> = {
  key: "list-list",
  type: "search",
  resource: "list",
  title: "List Lists",
  description: "List the custom lists in this nation.",
  params: [...pagination],
  output: [{ key: "items", type: "array", label: "Lists" }],

  async execute(input, ctx) {
    const res = await new NationBuilderClient(ctx).request<JsonApiDocument>("/lists", {
      query: { "page[size]": input.pageSize, "page[number]": input.pageNumber },
    });
    return { items: flattenMany(Array.isArray(res.data) ? res.data : []) };
  },
};

export default listList;
