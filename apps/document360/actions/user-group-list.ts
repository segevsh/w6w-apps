import type { ActionDefinition } from "@w6w/types";
import { Document360Client } from "../lib/client.ts";
import {
  listOutput,
  pageParam,
  pageSizeParam,
  pagingQuery,
  projectIdParam,
} from "../lib/params.ts";

/** List the project's team-account groups (id, title, description). */
interface Input {
  projectId?: string;
  page?: number;
  pageSize?: number;
}

const userGroupList: ActionDefinition<Input> = {
  key: "user-group-list",
  type: "read",
  resource: "user",
  title: "List Team Groups",
  description: "List the project's team-account groups (id, title, description).",
  params: [projectIdParam, pageParam, pageSizeParam],
  output: listOutput,

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    const { page, page_size } = pagingQuery(input);
    return await c.list(c.projectPath(input.projectId, "/users/groups"), { page, page_size });
  },
};

export default userGroupList;
