import type { ActionDefinition } from "@w6w/types";
import { Document360Client } from "../lib/client.ts";
import {
  listOutput,
  pageParam,
  pageSizeParam,
  pagingQuery,
  projectIdParam,
} from "../lib/params.ts";

/** List the project's tags, optionally filtered by a name substring. */
interface Input {
  projectId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

const tagList: ActionDefinition<Input> = {
  key: "tag-list",
  type: "read",
  resource: "project",
  title: "List Tags",
  description: "List the project's tags, optionally filtered by a name substring.",
  params: [
    projectIdParam,
    { key: "search", label: "Search", type: "string", hint: "Case-insensitive name substring." },
    pageParam,
    pageSizeParam,
  ],
  output: listOutput,

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    const { page, page_size } = pagingQuery(input);
    return await c.list(c.projectPath(input.projectId, "/tags"), {
      search: input.search,
      page,
      page_size,
    });
  },
};

export default tagList;
