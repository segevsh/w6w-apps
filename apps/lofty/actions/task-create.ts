import type { ActionDefinition } from "@w6w/types";
import { compact, LoftyClient } from "../lib/client.ts";
import { deadlineParam, finishFlagParam, leadIdParam } from "../lib/params.ts";

/**
 * `POST /v1.0/tasks` — create a follow-up task.
 *
 * Answers `{ "taskId": <id> }`.
 *
 * ## The deadline is epoch milliseconds, not a date string
 *
 * `deadline` is an integer in milliseconds since the Unix epoch, UTC —
 * everywhere else in this app time is a `yyyy-MM-dd HH:mm:ss` string. Sending
 * a formatted date here fails or, worse, is read as a tiny epoch value.
 *
 * `assignedRole` is a role *name* ("Agent"), not a user id: the task is
 * attached to whoever holds that role on the lead, which is how routing keeps
 * working when the assignee changes.
 */
interface Input {
  content: string;
  leadId: number;
  deadline: number;
  type: string;
  assignedRole: string;
  finishFlag?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a follow-up task with a deadline and an assigned role (POST /v1.0/tasks).",
  idempotent: false,
  params: [
    { key: "content", label: "Task", type: "string", required: true, hint: "What to do." },
    leadIdParam,
    deadlineParam,
    {
      key: "type",
      label: "Type",
      type: "string",
      required: true,
      placeholder: "Call",
      hint: "Lofty's task type, e.g. Call, Email, Text, Appointment.",
    },
    {
      key: "assignedRole",
      label: "Assigned role",
      type: "string",
      required: true,
      placeholder: "Agent",
      hint: "A role name, not a user id — the task follows whoever holds that role on the lead.",
    },
    finishFlagParam,
  ],
  output: [{ key: "taskId", type: "number", label: "Created task ID" }],

  execute(input, ctx) {
    const body = compact({
      content: input.content,
      leadId: input.leadId,
      deadline: input.deadline,
      type: input.type,
      assignedRole: input.assignedRole,
      finishFlag: input.finishFlag,
    });
    return new LoftyClient(ctx).request<{ taskId?: number }>("/tasks", { method: "POST", body });
  },
};

export default action;
