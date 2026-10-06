import type { ActionDefinition } from "@w6w/types";
import { Document360Client } from "../lib/client.ts";
import {
  listOutput,
  pageParam,
  pageSizeParam,
  pagingQuery,
  projectIdParam,
} from "../lib/params.ts";

/** List the project's team accounts, optionally filtered by name or email. */
interface Input {
  projectId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List Team Accounts",
  description: "List the project's team accounts, optionally filtered by name or email.",
  params: [
    projectIdParam,
    { key: "search", label: "Search", type: "string", hint: "Matches name or email." },
    pageParam,
    pageSizeParam,
  ],
  output: listOutput,

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    const { page, page_size } = pagingQuery(input);
    return await c.list(c.projectPath(input.projectId, "/users"), {
      search: input.search,
      page,
      page_size,
    });
  },
};

export default userList;
