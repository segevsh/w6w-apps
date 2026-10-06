import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, EverhourClient, toList, toNumberList } from "../lib/client.ts";

/**
 * `PUT /tasks/{taskId}` — Update a task.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  taskId: string;
  name: string;
  section: number;
  labels?: string[] | string;
  position?: number;
  description?: string;
  dueOn?: string;
  assignees?: number[] | string;
  status?: string;
}

const taskUpdate: ActionDefinition<Input> = {
  key: "task-update",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description: "Update a task.",
  idempotent: true,
  params: [
    {
      key: "taskId",
      label: "Task ID",
      type: "string",
      required: true,
      hint: "Everhour task id, e.g. `ev:3000010034` (or `{platform}:{id}`).",
    },
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "section",
      label: "Section ID",
      type: "number",
      required: true,
      hint: "Section the task belongs to (List Project Sections).",
    },
    { key: "labels", label: "Labels", type: "string", hint: "Comma-separated labels." },
    { key: "position", label: "Position", type: "number" },
    { key: "description", label: "Description", type: "text" },
    { key: "dueOn", label: "Due on", type: "date", hint: "YYYY-MM-DD." },
    {
      key: "assignees",
      label: "Assignee user IDs",
      type: "string",
      hint: "Comma-separated user ids.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "open", label: "open" }, { value: "closed", label: "closed" }],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "open or closed" },
    { key: "time", type: "object", label: "Tracked time" },
    { key: "estimate", type: "object", label: "Estimate" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/tasks/${encodeId(input.taskId)}`, {
      method: "PUT",
      body: compact({
        name: input.name,
        section: input.section,
        labels: toList(input.labels),
        position: input.position,
        description: input.description,
        dueOn: input.dueOn,
        assignees: toNumberList(input.assignees)?.map((userId) => ({ userId })),
        status: input.status,
      }),
    });
  },
};

export default taskUpdate;
