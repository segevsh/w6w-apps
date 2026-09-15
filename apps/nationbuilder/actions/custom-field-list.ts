import type { ActionDefinition } from "@w6w/types";
import { flattenMany, type JsonApiDocument, NationBuilderClient } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  pageSize?: number;
  pageNumber?: number;
}

/**
 * `GET /api/v2/custom_fields` — confirmed against the vendor's OpenAPI spec.
 * Lists the fields a nation has defined for itself, so a workflow can
 * populate `person-create`/`person-update`'s `customValues` param with the
 * keys a given nation actually has configured instead of guessing.
 */
const customFieldList: ActionDefinition<Input> = {
  key: "custom-field-list",
  type: "search",
  resource: "custom-field",
  title: "List Custom Fields",
  description: "List the custom fields this nation has defined on people.",
  params: [...pagination],
  output: [{ key: "items", type: "array", label: "Custom fields" }],

  async execute(input, ctx) {
    const res = await new NationBuilderClient(ctx).request<JsonApiDocument>("/custom_fields", {
      query: { "page[size]": input.pageSize, "page[number]": input.pageNumber },
    });
    return { items: flattenMany(Array.isArray(res.data) ? res.data : []) };
  },
};

export default customFieldList;
