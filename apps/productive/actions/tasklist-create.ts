import type { ActionDefinition } from "@w6w/types";
import { jsonApiBody, ProductiveClient } from "../lib/client.ts";
import { resourceOutput } from "../lib/params.ts";

/**
 * Create a task list on a project (`POST /task_lists`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  name: string;
  projectId: number;
  folderId?: number;
  position?: number;
}

const tasklistCreate: ActionDefinition<Input> = {
  key: "tasklist-create",
  type: "perform",
  resource: "task_list",
  title: "Create Task List",
  description: "Create a task list on a project (`POST /task_lists`).",
  idempotent: false,
  params: [
    { "key": "name", "label": "Name", "type": "string", "required": true },
    { "key": "projectId", "label": "Project ID", "type": "number", "required": true },
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
    return await new ProductiveClient(ctx).one(`/task_lists`, {
      method: "POST",
      body: jsonApiBody("task_lists", attrs),
    });
  },
};

export default tasklistCreate;
