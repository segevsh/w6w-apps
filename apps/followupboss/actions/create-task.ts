import type { ActionDefinition } from "@w6w/types";
import { compact, FubClient, optionsFrom, TASK_TYPES } from "../lib/client.ts";

interface Input {
  personId: number;
  name?: string;
  type?: string;
  assignedTo?: string;
  assignedUserId?: number;
  isCompleted?: boolean;
  dueDate?: string;
  dueDateTime?: string;
  remindSecondsBefore?: number;
}

/**
 * `POST /tasks` — create a task.
 *
 * ## The assignment rule the schema states twice
 *
 * `assignedTo` and `assignedUserId` are each marked optional, but each one's
 * description adds "(Note: This is required if the other is empty.)" — so
 * exactly one of the pair is genuinely required, which no single `required` flag
 * can express. Both params say so, and the action description repeats it, since
 * omitting both is the obvious way to get a confusing 400.
 *
 * ## Two due-date fields, and the reminder depends on which
 *
 * `dueDate` is a plain `YYYY-MM-DD`; `dueDateTime` carries a time and accepts a
 * timezone suffix (`2004-11-16T03:00:00 -05:00`). They are not interchangeable
 * for reminders: `remindSecondsBefore` "is only available for tasks with a due
 * time set", so a reminder on a `dueDate`-only task has nothing to count back
 * from.
 */
const createTask: ActionDefinition<Input> = {
  key: "create-task",
  type: "perform",
  resource: "task",
  title: "Create Task",
  idempotent: false,
  description:
    "Create a task against a contact. Supply exactly one of Assigned user id or Assigned to " +
    "(name) — the API requires one of the pair even though both are individually optional.",
  params: [
    {
      key: "personId",
      label: "Person id",
      type: "number",
      required: true,
      hint: "The contact this task relates to.",
    },
    { key: "name", label: "Name", type: "string", hint: "What the task is." },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: optionsFrom(TASK_TYPES),
      hint: "Task type.",
    },
    {
      key: "assignedUserId",
      label: "Assigned user id",
      type: "number",
      hint: "Agent to assign. **Required unless** Assigned to (name) is set. Ids come from the " +
        "List Users action.",
    },
    {
      key: "assignedTo",
      label: "Assigned to (name)",
      type: "string",
      hint: "Full name of the agent. **Required unless** Assigned user id is set. Prefer the id.",
    },
    {
      key: "dueDate",
      label: "Due date",
      type: "string",
      hint: "`YYYY-MM-DD`. Date only — use Due date/time if you need a reminder.",
    },
    {
      key: "dueDateTime",
      label: "Due date/time",
      type: "string",
      hint: "Due date with a time, timezone suffix supported: `2026-11-16T03:00:00 -05:00`. " +
        "Required for reminders to work.",
    },
    {
      key: "remindSecondsBefore",
      label: "Remind (seconds before)",
      type: "number",
      advanced: true,
      hint: "Email and desktop reminder, this many seconds before the task is due. **Only works " +
        "when Due date/time is set** — a date-only task has no time to count back from.",
    },
    {
      key: "isCompleted",
      label: "Completed",
      type: "boolean",
      advanced: true,
      hint: "Create the task already marked done.",
    },
  ],
  output: [{ key: "id", type: "number", label: "Task id" }],

  execute(input, ctx) {
    return new FubClient(ctx).request("/tasks", {
      method: "POST",
      body: compact({
        personId: input.personId,
        name: input.name,
        type: input.type,
        assignedTo: input.assignedTo,
        assignedUserId: input.assignedUserId,
        isCompleted: input.isCompleted,
        dueDate: input.dueDate,
        dueDateTime: input.dueDateTime,
        remindSecondsBefore: input.remindSecondsBefore,
      }),
    });
  },
};

export default createTask;
