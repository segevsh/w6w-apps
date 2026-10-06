import type { ActionDefinition } from "@w6w/types";
import { Document360Client, toList } from "../lib/client.ts";
import {
  listOutput,
  pageParam,
  pageSizeParam,
  pagingQuery,
  projectIdParam,
} from "../lib/params.ts";

/** Full-text search across Drive file names, with optional filters for uploader, date range, tags and images only. */
interface Input {
  projectId?: string;
  searchKeyword: string;
  allowImagesOnly?: boolean;
  userIds?: string[] | string;
  filterFromDate?: string;
  filterToDate?: string;
  filterTags?: string[] | string;
  page?: number;
  pageSize?: number;
}

const driveSearch: ActionDefinition<Input> = {
  key: "drive-search",
  type: "search",
  resource: "drive",
  title: "Search Drive",
  description:
    "Full-text search across Drive file names, with optional filters for uploader, date range, tags and images only.",
  params: [
    projectIdParam,
    { key: "searchKeyword", label: "Keyword", type: "string", required: true },
    { key: "allowImagesOnly", label: "Images only", type: "boolean", default: false },
    { key: "userIds", label: "Uploaded by (user IDs)", type: "string", repeat: true },
    { key: "filterFromDate", label: "Updated on or after", type: "datetime" },
    { key: "filterToDate", label: "Updated on or before", type: "datetime" },
    { key: "filterTags", label: "Tags", type: "string", repeat: true },
    pageParam,
    pageSizeParam,
  ],
  output: listOutput,

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    const { page, page_size } = pagingQuery(input);
    return await c.list(c.projectPath(input.projectId, "/drive/search"), {
      search_keyword: input.searchKeyword,
      allow_images_only: input.allowImagesOnly ? true : undefined,
      user_ids: toList(input.userIds),
      filter_from_date: input.filterFromDate,
      filter_to_date: input.filterToDate,
      filter_tags: toList(input.filterTags),
      page,
      page_size,
    });
  },
};

export default driveSearch;
