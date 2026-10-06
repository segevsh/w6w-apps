import type { ActionDefinition } from "@w6w/types";
import { Document360Client } from "../lib/client.ts";
import {
  listOutput,
  pageParam,
  pageSizeParam,
  pagingQuery,
  projectIdParam,
} from "../lib/params.ts";

/** List the readers of a private or mixed knowledge base, optionally filtered by email. */
interface Input {
  projectId?: string;
  searchEmail?: string;
  page?: number;
  pageSize?: number;
}

const readerList: ActionDefinition<Input> = {
  key: "reader-list",
  type: "read",
  resource: "reader",
  title: "List Readers",
  description:
    "List the readers of a private or mixed knowledge base, optionally filtered by email.",
  params: [
    projectIdParam,
    {
      key: "searchEmail",
      label: "Email",
      type: "string",
      hint: "Filter readers by email address.",
    },
    pageParam,
    pageSizeParam,
  ],
  output: listOutput,

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    const { page, page_size } = pagingQuery(input);
    return await c.list(c.projectPath(input.projectId, "/readers"), {
      search_email: input.searchEmail,
      page,
      page_size,
    });
  },
};

export default readerList;
