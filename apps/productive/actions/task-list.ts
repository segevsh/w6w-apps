import type { ActionDefinition } from "@w6w/types";
import { listQuery, ProductiveClient } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/**
 * List tasks, filtered, sorted and paged (`GET /tasks`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  query?: string;
  projectId?: number;
  taskListId?: number;
  assigneeId?: number;
  creatorId?: number;
  status?: number;
  workflowStatusId?: number;
  workflowStatusCategoryId?: number;
  dueDateAfter?: string;
  dueDateBefore?: string;
  filter?: unknown;
  sort?: string;
  include?: string;
  pageSize?: number;
  pageNumber?: number;
  cursorPaging?: boolean;
  cursor?: string;
}

const taskList: ActionDefinition<Input> = {
  key: "task-list",
  type: "search",
  resource: "task",
  title: "List Tasks",
  description: "List tasks, filtered, sorted and paged (`GET /tasks`).",
  params: [
    { "key": "query", "label": "Search text", "type": "string" },
    { "key": "projectId", "label": "Project ID", "type": "number" },
    { "key": "taskListId", "label": "Task list ID", "type": "number" },
    { "key": "assigneeId", "label": "Assignee ID", "type": "number" },
    { "key": "creatorId", "label": "Creator ID", "type": "number" },
    {
      "key": "status",
      "label": "Status",
      "type": "select",
      "hint": "1 = open, 2 = closed.",
      "options": [{ "value": 1, "label": "Open" }, { "value": 2, "label": "Closed" }],
    },
    { "key": "workflowStatusId", "label": "Workflow status ID", "type": "number" },
    {
      "key": "workflowStatusCategoryId",
      "label": "Workflow status category",
      "type": "select",
      "hint": "1 = not started, 2 = started, 3 = closed.",
      "options": [{ "value": 1, "label": "Not started" }, { "value": 2, "label": "Started" }, {
        "value": 3,
        "label": "Closed",
      }],
    },
    { "key": "dueDateAfter", "label": "Due after", "type": "date" },
    { "key": "dueDateBefore", "label": "Due before", "type": "date" },
    ...listParams(
      "`due_date`, `-created_at`, `title`, `-updated_at`, `task_number`, `project_name`; prefix `-` for descending.",
    ),
  ],
  output: listOutput,

  async execute(input, ctx) {
    const items = await new ProductiveClient(ctx).many("/tasks", {
      query: listQuery(input, {
        "query": input.query,
        "project_id": input.projectId,
        "task_list_id": input.taskListId,
        "assignee_id": input.assigneeId,
        "creator_id": input.creatorId,
        "status": input.status,
        "workflow_status_id": input.workflowStatusId,
        "workflow_status_category_id": input.workflowStatusCategoryId,
        "due_date_after": input.dueDateAfter,
        "due_date_before": input.dueDateBefore,
      }),
    });
    return items;
  },
};

export default taskList;
