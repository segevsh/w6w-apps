import type { ActionDefinition } from "@w6w/types";
import {
  FlodeskClient,
  type FlodeskList,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

type Input = PageInput;

/**
 * `GET /v1/custom-fields` — the paginated form. Flodesk publishes a second,
 * unpaginated form at `/custom-fields/all`; both are shipped, because they
 * return genuinely different shapes (`{ meta, data }` here, a bare array there)
 * and the choice matters to whoever consumes the result.
 */
const listCustomFields: ActionDefinition<Input> = {
  key: "list-custom-fields",
  type: "search",
  resource: "custom-field",
  title: "List Custom Fields",
  description:
    "List custom fields one page at a time, as `{ meta, data }`. Each field carries its `key` (what you write to) and its `label` (what the UI shows). For the whole set in one call, use List All Custom Fields.",
  params: [...PAGE_PARAMS],
  output: [
    { key: "data", type: "array", label: "Custom fields" },
    ...PAGE_OUTPUT,
  ],

  execute(input, ctx) {
    return new FlodeskClient(ctx).request<FlodeskList>("/custom-fields", {
      query: pageQuery(input),
    });
  },
};

export default listCustomFields;
