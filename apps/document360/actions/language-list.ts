import type { ActionDefinition } from "@w6w/types";
import { Document360Client } from "../lib/client.ts";
import { listOutput, pagingParams, pagingQuery, projectIdParam } from "../lib/params.ts";

/** List the languages configured for a workspace (the default workspace when none is given). */
interface Input {
  projectId?: string;
  workspaceId?: string;
  page?: number;
  pageSize?: number;
  cursor?: string;
  includeTotalCount?: boolean;
}

const languageList: ActionDefinition<Input> = {
  key: "language-list",
  type: "read",
  resource: "project",
  title: "List Languages",
  description:
    "List the languages configured for a workspace (the default workspace when none is given).",
  params: [projectIdParam, {
    key: "workspaceId",
    label: "Workspace ID",
    type: "string",
    hint: "Defaults to the default workspace.",
  }, ...pagingParams],
  output: listOutput,

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    return await c.list(c.projectPath(input.projectId, "/languages"), {
      ...pagingQuery(input),
      workspace_id: input.workspaceId,
    });
  },
};

export default languageList;
