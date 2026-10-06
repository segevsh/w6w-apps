import type { ActionDefinition } from "@w6w/types";
import { jsonApiBody, ProductiveClient } from "../lib/client.ts";
import { resourceOutput } from "../lib/params.ts";

/**
 * Add a checklist item to a task or deal (`POST /todos`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  description: string;
  taskId?: number;
  dealId?: number;
  assigneeId?: number;
  dueDate?: string;
  position?: number;
  closed?: boolean;
}

const todoCreate: ActionDefinition<Input> = {
  key: "todo-create",
  type: "perform",
  resource: "todo",
  title: "Create To-do",
  description: "Add a checklist item to a task or deal (`POST /todos`).",
  idempotent: false,
  params: [
    {
      "key": "description",
      "label": "Description",
      "type": "text",
      "required": true,
      "hint": "The checklist item text.",
    },
    { "key": "taskId", "label": "Task ID", "type": "number" },
    { "key": "dealId", "label": "Deal ID", "type": "number" },
    { "key": "assigneeId", "label": "Assignee ID", "type": "number" },
    { "key": "dueDate", "label": "Due date", "type": "date" },
    { "key": "position", "label": "Position", "type": "number" },
    { "key": "closed", "label": "Closed", "type": "boolean", "hint": "Mark the item done." },
  ],
  output: resourceOutput("To-do"),

  async execute(input, ctx) {
    const attrs = {
      "description": input.description,
      "task_id": input.taskId,
      "deal_id": input.dealId,
      "assignee_id": input.assigneeId,
      "due_date": input.dueDate,
      "position": input.position,
      "closed": input.closed,
    };
    return await new ProductiveClient(ctx).one(`/todos`, {
      method: "POST",
      body: jsonApiBody("todos", attrs),
    });
  },
};

export default todoCreate;
