import type { ActionDefinition } from "@w6w/types";
import { compact, LoftyClient } from "../lib/client.ts";
import { deadlineParam, finishFlagParam, leadIdParam } from "../lib/params.ts";

/**
 * `PUT /v1.0/tasks/{taskId}` — update a task.
 *
 * ## A documented tension, surfaced rather than resolved silently
 *
 * The operation is described as "partially updates an existing task — fields
 * not supplied are left unchanged", but its schema marks `content`, `leadId`,
 * `deadline`, `type` and `assignedRole` required. The one field the description
 * explicitly covers is `finishFlag`: "when true on update, the task is marked
 * completed and other fields are ignored".
 *
 * This action follows the schema — the five marked-required fields are
 * required — because sending a body the vendor calls incomplete is the worse
 * guess. Completing a task therefore means supplying the task's own values
 * along with `finishFlag: true`, or marking it finished through Lofty's UI.
 *
 * The response body is not documented, so the HTTP status is returned.
 */
interface Input {
  taskId: number;
  content: string;
  leadId: number;
  deadline: number;
  type: string;
  assignedRole: string;
  finishFlag?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "task-update",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description: "Update a task's content, deadline or assignment, or complete it with finishFlag " +
    "(PUT /v1.0/tasks/{taskId}).",
  idempotent: true,
  params: [
    {
      key: "taskId",
      label: "Task ID",
      type: "number",
      required: true,
      hint: "The task to update.",
    },
    { key: "content", label: "Task", type: "string", required: true },
    leadIdParam,
    deadlineParam,
    { key: "type", label: "Type", type: "string", required: true, placeholder: "Call" },
    {
      key: "assignedRole",
      label: "Assigned role",
      type: "string",
      required: true,
      placeholder: "Agent",
    },
    finishFlagParam,
  ],
  output: [
    { key: "taskId", type: "number", label: "Updated task ID" },
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    const body = compact({
      content: input.content,
      leadId: input.leadId,
      deadline: input.deadline,
      type: input.type,
      assignedRole: input.assignedRole,
      finishFlag: input.finishFlag,
    });
    const status = await new LoftyClient(ctx).status(`/tasks/${input.taskId}`, {
      method: "PUT",
      body,
    });
    return { taskId: input.taskId, status };
  },
};

export default action;
