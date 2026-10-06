import type { ActionDefinition } from "@w6w/types";
import { encodeId, jsonApiBody, ProductiveClient, requireAny } from "../lib/client.ts";
import { resourceOutput } from "../lib/params.ts";

/**
 * Edit or complete a checklist item (`PATCH /todos/{id}`). Only the fields you set are sent.
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  id: string | number;
  description?: string;
  taskId?: number;
  dealId?: number;
  assigneeId?: number;
  dueDate?: string;
  position?: number;
  closed?: boolean;
}

const todoUpdate: ActionDefinition<Input> = {
  key: "todo-update",
  type: "perform",
  resource: "todo",
  title: "Update To-do",
  description:
    "Edit or complete a checklist item (`PATCH /todos/{id}`). Only the fields you set are sent.",
  idempotent: true,
  params: [
    { key: "id", label: "To-do ID", type: "string", required: true },
    {
      "key": "description",
      "label": "Description",
      "type": "text",
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
    requireAny(attrs, "to-do");
    return await new ProductiveClient(ctx).one(`/todos/${encodeId(input.id)}`, {
      method: "PATCH",
      body: jsonApiBody("todos", attrs),
    });
  },
};

export default todoUpdate;
