import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoogleTasksClient } from "../lib/client.ts";

interface Input {
  taskList: string;
  task: string;
  completed?: string;
}

/**
 * Mark a task done — `tasks.patch` with `status: "completed"`.
 * https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/patch
 *
 * There is no dedicated "complete" endpoint on the Tasks API; completion is a
 * field on the Task resource. This is the one-field patch spelled out, because
 * "mark this done" is the most common single thing a workflow wants to do and
 * routing it through the general `update-task` means hand-writing the enum.
 *
 * To reopen a task, use `update-task` with `status: "needsAction"`.
 */
const completeTask: ActionDefinition<Input> = {
  key: "complete-task",
  type: "perform",
  resource: "task",
  title: "Complete Task",
  description:
    "Mark a task as completed. Use `update-task` with status `needsAction` to reopen one.",
  // Completing an already-completed task leaves it completed.
  idempotent: true,
  params: [
    { key: "taskList", label: "Task list ID", type: "string", required: true },
    { key: "task", label: "Task ID", type: "string", required: true },
    {
      key: "completed",
      label: "Completion date (RFC 3339)",
      type: "datetime",
      hint: "Omit to let Google stamp the current time.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "completed", type: "string", label: "Completion date (RFC 3339)" },
  ],

  execute(input, ctx) {
    const client = new GoogleTasksClient(ctx);
    const body: Record<string, unknown> = { status: "completed" };
    if (input.completed !== undefined) body.completed = input.completed;

    return client.request(
      `/lists/${encodeId(input.taskList)}/tasks/${encodeId(input.task)}`,
      { method: "PATCH", body },
    );
  },
};

export default completeTask;
