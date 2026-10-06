import type { ActionDefinition } from "@w6w/types";
import { encodeId, jsonApiBody, ProductiveClient, requireAny } from "../lib/client.ts";
import { resourceOutput } from "../lib/params.ts";

/**
 * Rename or reposition a task list (`PATCH /task_lists/{id}`). Only the fields you set are sent.
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  id: string | number;
  name?: string;
  projectId?: number;
  folderId?: number;
  position?: number;
}

const tasklistUpdate: ActionDefinition<Input> = {
  key: "tasklist-update",
  type: "perform",
  resource: "task_list",
  title: "Update Task List",
  description:
    "Rename or reposition a task list (`PATCH /task_lists/{id}`). Only the fields you set are sent.",
  idempotent: true,
  params: [
    { key: "id", label: "Task list ID", type: "string", required: true },
    { "key": "name", "label": "Name", "type": "string" },
    { "key": "projectId", "label": "Project ID", "type": "number" },
    {
      "key": "folderId",
      "label": "Board ID",
      "type": "number",
      "hint": "The board (the API calls it a folder) to put the list on.",
    },
    { "key": "position", "label": "Position", "type": "number" },
  ],
  output: resourceOutput("Task list"),

  async execute(input, ctx) {
    const attrs = {
      "name": input.name,
      "project_id": input.projectId,
      "folder_id": input.folderId,
      "position": input.position,
    };
    requireAny(attrs, "task list");
    return await new ProductiveClient(ctx).one(`/task_lists/${encodeId(input.id)}`, {
      method: "PATCH",
      body: jsonApiBody("task_lists", attrs),
    });
  },
};

export default tasklistUpdate;
