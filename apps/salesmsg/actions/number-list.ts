import type { ActionDefinition } from "@w6w/types";
import { SalesmsgClient } from "../lib/client.ts";

/**
 * `GET /numbers` — "Get numbers" (scope `numbers:read`). The document declares the 200 response
 * with no schema, so the body is normalised by shape (array, `{data}`) and returned whole under
 * `meta` if it is neither.
 */
interface Input {
  query?: string;
  page?: number;
  limit?: number;
}

const numberList: ActionDefinition<Input> = {
  key: "number-list",
  type: "search",
  resource: "number",
  title: "List Numbers",
  description: "List the organization's phone numbers.",
  params: [
    {
      key: "query",
      label: "Search",
      type: "string",
      hint: "Filter by number.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "Page number.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "limit",
      label: "Page size",
      type: "number",
      hint: "Results per page.",
      validation: { integer: true, min: 1, max: 100 },
    },
  ],
  output: [
    { key: "items", type: "array", label: "Rows" },
    { key: "meta", type: "object", label: "Pagination block, when the vendor sends one" },
  ],

  execute(input, ctx) {
    return new SalesmsgClient(ctx).items("/numbers", {
      query: {
        query: input.query,
        page: input.page,
        limit: input.limit,
      },
    });
  },
};

export default numberList;
