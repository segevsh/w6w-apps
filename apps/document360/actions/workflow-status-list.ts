import type { ActionDefinition } from "@w6w/types";
import { Document360Client } from "../lib/client.ts";
import {
  listOutput,
  pageParam,
  pageSizeParam,
  pagingQuery,
  projectIdParam,
} from "../lib/params.ts";

/** List the workflow statuses configured for the project. Empty when no workflow is set up. */
interface Input {
  projectId?: string;
  page?: number;
  pageSize?: number;
}

const workflowStatusList: ActionDefinition<Input> = {
  key: "workflow-status-list",
  type: "read",
  resource: "project",
  title: "List Workflow Statuses",
  description:
    "List the workflow statuses configured for the project. Empty when no workflow is set up.",
  params: [projectIdParam, pageParam, pageSizeParam],
  output: listOutput,

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    const { page, page_size } = pagingQuery(input);
    return await c.list(c.projectPath(input.projectId, "/workflow-statuses"), { page, page_size });
  },
};

export default workflowStatusList;
