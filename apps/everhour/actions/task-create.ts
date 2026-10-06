import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, EverhourClient, toList, toNumberList } from "../lib/client.ts";

/**
 * `POST /projects/{projectId}/tasks` — Create a task in a project.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  projectId: string;
  name: string;
  section: number;
  labels?: string[] | string;
  position?: number;
  description?: string;
  dueOn?: string;
  assignees?: number[] | string;
  status?: string;
}

const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a task in a project.",
  idempotent: false,
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint:
        "Everhour project id: `ev:1234567890` for a native project, or `{platform}:{id}` such as `as:123456` for an integration project.",
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
    return new EverhourClient(ctx).one(`/projects/${encodeId(input.projectId)}/tasks`, {
      method: "POST",
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

export default taskCreate;
