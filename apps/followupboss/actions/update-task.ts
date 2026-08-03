import type { ActionDefinition } from "@w6w/types";
import { compact, FubClient, optionsFrom, TASK_TYPES } from "../lib/client.ts";

interface Input {
  id: number;
  personId?: number;
  name?: string;
  type?: string;
  assignedTo?: string;
  assignedUserId?: number;
  isCompleted?: boolean;
}

/**
 * `PUT /tasks/{id}` — update a task. The usual reason to call it is completing
 * one.
 *
 * The request schema here is narrower than `POST /tasks`, and deliberately so:
 * it declares `personId`, `assignedTo`, `assignedUserId`, `name`, `type` and
 * `isCompleted` — and **no due-date fields**. `dueDate`, `dueDateTime` and
 * `remindSecondsBefore` are creation-time only per the published schema, so they
 * are not offered here. Sending an undocumented field would be inventing surface
 * on the strength of a guess about symmetry.
 *
 * `idempotent: true`: setting a task's state to completed converges — running it
 * twice leaves the same task in the same state, rather than producing a second
 * one.
 */
const updateTask: ActionDefinition<Input> = {
  key: "update-task",
  type: "perform",
  resource: "task",
  title: "Update Task",
  idempotent: true,
  description:
    "Update a task — most often to mark it complete, or to reassign it. Due dates and reminders " +
    "are set at creation only and cannot be changed through this endpoint.",
  params: [
    { key: "id", label: "Task id", type: "number", required: true },
    {
      key: "isCompleted",
      label: "Completed",
      type: "boolean",
      hint: "Mark the task done (or reopen it).",
    },
    { key: "name", label: "Name", type: "string" },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: optionsFrom(TASK_TYPES),
    },
    {
      key: "assignedUserId",
      label: "Assigned user id",
      type: "number",
      hint: "Reassign to this agent.",
    },
    {
      key: "assignedTo",
      label: "Assigned to (name)",
      type: "string",
      advanced: true,
      hint: "Full name of the agent. Prefer the id where you have it.",
    },
    {
      key: "personId",
      label: "Person id",
      type: "number",
      advanced: true,
      hint: "Move the task to a different contact.",
    },
  ],
  output: [{ key: "id", type: "number", label: "Task id" }],

  execute(input, ctx) {
    return new FubClient(ctx).request(`/tasks/${input.id}`, {
      method: "PUT",
      body: compact({
        personId: input.personId,
        name: input.name,
        type: input.type,
        assignedTo: input.assignedTo,
        assignedUserId: input.assignedUserId,
        isCompleted: input.isCompleted,
      }),
    });
  },
};

export default updateTask;
