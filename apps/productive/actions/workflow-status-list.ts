import type { ActionDefinition } from "@w6w/types";
import { listQuery, ProductiveClient } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/**
 * List task workflow statuses (the columns tasks move through), filtered and paged (`GET /workflow_statuses`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  workflowId?: number;
  projectId?: number;
  categoryId?: number;
  name?: string;
  filter?: unknown;
  sort?: string;
  include?: string;
  pageSize?: number;
  pageNumber?: number;
  cursorPaging?: boolean;
  cursor?: string;
}

const workflowStatusList: ActionDefinition<Input> = {
  key: "workflow-status-list",
  type: "search",
  resource: "workflow_status",
  title: "List Workflow Statuses",
  description:
    "List task workflow statuses (the columns tasks move through), filtered and paged (`GET /workflow_statuses`).",
  params: [
    { "key": "workflowId", "label": "Workflow ID", "type": "number" },
    { "key": "projectId", "label": "Project ID", "type": "number" },
    {
      "key": "categoryId",
      "label": "Category",
      "type": "select",
      "hint": "1 = not started, 2 = started, 3 = closed.",
      "options": [{ "value": 1, "label": "Not started" }, { "value": 2, "label": "Started" }, {
        "value": 3,
        "label": "Closed",
      }],
    },
    { "key": "name", "label": "Name", "type": "string" },
    ...listParams("`name`, `position`; prefix `-` for descending."),
  ],
  output: listOutput,

  async execute(input, ctx) {
    const items = await new ProductiveClient(ctx).many("/workflow_statuses", {
      query: listQuery(input, {
        "workflow_id": input.workflowId,
        "project_id": input.projectId,
        "category_id": input.categoryId,
        "name": input.name,
      }),
    });
    return items;
  },
};

export default workflowStatusList;
