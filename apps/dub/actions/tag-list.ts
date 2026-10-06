import type { ActionDefinition } from "@w6w/types";
import { DubClient, strList } from "../lib/client.ts";

interface Input {
  search?: string;
  ids?: string[] | string;
  sortBy?: "name" | "createdAt";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

/** `GET /tags` — page-numbered, 100 per page by default. */
const tagList: ActionDefinition<Input> = {
  key: "tag-list",
  type: "search",
  resource: "tag",
  title: "List Tags",
  description: "List the workspace's link tags, one page at a time.",
  params: [
    { key: "search", label: "Search", type: "string" },
    {
      key: "ids",
      label: "Tag IDs",
      type: "array",
      item: { type: "string" },
      hint: "Only these tags.",
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: [{ value: "name", label: "Name" }, { value: "createdAt", label: "Created at" }],
      hint: "Defaults to name.",
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
      hint: "Defaults to ascending.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "First page is 1.",
      validation: { min: 1, integer: true },
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      hint: "Defaults to 100, the maximum.",
      validation: { min: 1, max: 100, integer: true },
    },
  ],
  output: [{ key: "tags", type: "array", label: "Tags on this page: { id, name, color }" }],

  async execute(input, ctx) {
    const tags = await new DubClient(ctx).request("GET", "/tags", {
      query: {
        search: input.search,
        ids: strList(input.ids),
        sortBy: input.sortBy,
        sortOrder: input.sortOrder,
        page: input.page,
        pageSize: input.pageSize,
      },
    });
    return { tags };
  },
};

export default tagList;
