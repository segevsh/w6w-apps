import type { ActionDefinition } from "@w6w/types";
import { listQuery, ProductiveClient } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/**
 * List to-do checklist items, filtered and paged (`GET /todos`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  taskId?: number;
  dealId?: number;
  assigneeId?: number;
  status?: number;
  filter?: unknown;
  sort?: string;
  include?: string;
  pageSize?: number;
  pageNumber?: number;
  cursorPaging?: boolean;
  cursor?: string;
}

const todoList: ActionDefinition<Input> = {
  key: "todo-list",
  type: "search",
  resource: "todo",
  title: "List To-dos",
  description: "List to-do checklist items, filtered and paged (`GET /todos`).",
  params: [
    { "key": "taskId", "label": "Task ID", "type": "number" },
    { "key": "dealId", "label": "Deal ID", "type": "number" },
    { "key": "assigneeId", "label": "Assignee ID", "type": "number" },
    {
      "key": "status",
      "label": "Status",
      "type": "select",
      "hint": "Vendor status filter: 1 or 2.",
      "options": [{ "value": 1, "label": "Open" }, { "value": 2, "label": "Closed" }],
    },
    ...listParams(
      "Not documented for this resource; the vendor answers 400 on an unsupported sort.",
    ),
  ],
  output: listOutput,

  async execute(input, ctx) {
    const items = await new ProductiveClient(ctx).many("/todos", {
      query: listQuery(input, {
        "task_id": input.taskId,
        "deal_id": input.dealId,
        "assignee_id": input.assigneeId,
        "status": input.status,
      }),
    });
    return items;
  },
};

export default todoList;
