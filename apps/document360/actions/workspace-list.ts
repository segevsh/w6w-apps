import type { ActionDefinition } from "@w6w/types";
import { Document360Client } from "../lib/client.ts";
import { listOutput, pagingParams, pagingQuery, projectIdParam } from "../lib/params.ts";

/** List a project's workspaces (versions of its content). Workspace ids are needed by article and category creation. */
interface Input {
  projectId?: string;
  page?: number;
  pageSize?: number;
  cursor?: string;
  includeTotalCount?: boolean;
}

const workspaceList: ActionDefinition<Input> = {
  key: "workspace-list",
  type: "read",
  resource: "workspace",
  title: "List Workspaces",
  description:
    "List a project's workspaces (versions of its content). Workspace ids are needed by article and category creation.",
  params: [projectIdParam, ...pagingParams],
  output: listOutput,

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    return await c.list(c.projectPath(input.projectId, "/workspaces"), pagingQuery(input));
  },
};

export default workspaceList;
