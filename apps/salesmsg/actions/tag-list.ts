import type { ActionDefinition } from "@w6w/types";
import { SalesmsgClient } from "../lib/client.ts";

/**
 * `GET /tags` (scope `tags:read`). Answers `{data: [...]}`. The tag `id` is what `contact-tag-add`
 * takes.
 */
interface Input {
  search?: string;
  page?: number;
  length?: number;
  sortBy?: string;
  sortOrder?: string;
}

const tagList: ActionDefinition<Input> = {
  key: "tag-list",
  type: "search",
  resource: "tag",
  title: "List Tags",
  description: "List tags.",
  params: [
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Match against the tag label.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "Page number.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "length",
      label: "Page size",
      type: "number",
      hint: "Results per page.",
      validation: { integer: true, min: 1, max: 100 },
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "string",
      hint: "Field to sort by (name, label, ...).",
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
    },
  ],
  output: [
    { key: "items", type: "array", label: "Rows" },
    { key: "meta", type: "object", label: "Pagination block, when the vendor sends one" },
  ],

  execute(input, ctx) {
    return new SalesmsgClient(ctx).items("/tags", {
      query: {
        search: input.search,
        page: input.page,
        length: input.length,
        sortBy: input.sortBy,
        sortOrder: input.sortOrder,
      },
    });
  },
};

export default tagList;
