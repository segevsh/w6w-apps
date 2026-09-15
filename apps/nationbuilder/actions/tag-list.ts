import type { ActionDefinition } from "@w6w/types";
import { flattenMany, type JsonApiDocument, NationBuilderClient } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  pageSize?: number;
  pageNumber?: number;
}

/** `GET /api/v2/signup_tags` — confirmed against the vendor's OpenAPI spec. */
const tagList: ActionDefinition<Input> = {
  key: "tag-list",
  type: "search",
  resource: "tag",
  title: "List Tags",
  description: "List the tags defined in this nation.",
  params: [...pagination],
  output: [{ key: "items", type: "array", label: "Tags" }],

  async execute(input, ctx) {
    const res = await new NationBuilderClient(ctx).request<JsonApiDocument>("/signup_tags", {
      query: { "page[size]": input.pageSize, "page[number]": input.pageNumber },
    });
    return { items: flattenMany(Array.isArray(res.data) ? res.data : []) };
  },
};

export default tagList;
