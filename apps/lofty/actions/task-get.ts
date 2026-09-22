import type { ActionDefinition } from "@w6w/types";
import { LoftyClient } from "../lib/client.ts";

/**
 * `GET /v1.0/tasks/{taskId}` — one task, with pipeline context.
 *
 * The response is the task object under a `task` key, plus the lead's pipeline
 * context. The caller must have manage permission on the lead the task belongs
 * to.
 *
 * The wrapper is read defensively: if the API ever answers the task object at
 * the top level instead, that shape is returned unchanged rather than an empty
 * `undefined`.
 */
interface Input {
  taskId: number;
}

const action: ActionDefinition<Input> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Fetch one task by id, with its lead's pipeline context (GET /v1.0/tasks/{taskId}).",
  params: [
    {
      key: "taskId",
      label: "Task ID",
      type: "number",
      required: true,
      hint: "The `taskId` from a List Tasks or Create Task result.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Task ID" },
    { key: "leadId", type: "number", label: "Lead ID" },
    { key: "content", type: "string", label: "Task" },
    { key: "deadline", type: "string", label: "Deadline (UTC)" },
    { key: "finishFlag", type: "boolean", label: "Finished" },
    { key: "overdueFlag", type: "boolean", label: "Overdue and open" },
  ],

  async execute(input, ctx) {
    const body = await new LoftyClient(ctx).request<Record<string, unknown>>(
      `/tasks/${input.taskId}`,
    );
    const inner = body?.task;
    return inner && typeof inner === "object" ? inner as Record<string, unknown> : body;
  },
};

export default action;
