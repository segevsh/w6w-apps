import type { ActionDefinition } from "@w6w/types";
import { DubClient } from "../lib/client.ts";

interface Input {
  search?: string;
  page?: number;
  pageSize?: number;
}

/** `GET /folders` — page-numbered, at most 50 per page. */
const folderList: ActionDefinition<Input> = {
  key: "folder-list",
  type: "search",
  resource: "folder",
  title: "List Folders",
  description: "List the workspace's link folders, one page at a time.",
  params: [
    { key: "search", label: "Search", type: "string" },
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
      hint: "Defaults to 50, the maximum.",
      validation: { min: 1, max: 50, integer: true },
    },
  ],
  output: [{ key: "folders", type: "array", label: "Folders on this page" }],

  async execute(input, ctx) {
    const folders = await new DubClient(ctx).request("GET", "/folders", {
      query: { search: input.search, page: input.page, pageSize: input.pageSize },
    });
    return { folders };
  },
};

export default folderList;
