import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoogleTasksClient } from "../lib/client.ts";

interface Input {
  taskList: string;
  task: string;
}

/**
 * `tasks.get` — GET /lists/{tasklist}/tasks/{task}
 * https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/get
 *
 * Takes no query parameters. Reachable with `tasks.readonly`.
 */
const getTask: ActionDefinition<Input> = {
  key: "get-task",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Retrieve a single task by ID.",
  params: [
    { key: "taskList", label: "Task list ID", type: "string", required: true },
    { key: "task", label: "Task ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "notes", type: "string", label: "Notes" },
    { key: "status", type: "string", label: "Status (needsAction | completed)" },
    { key: "due", type: "string", label: "Due date (RFC 3339)" },
    { key: "completed", type: "string", label: "Completion date (RFC 3339)" },
    { key: "parent", type: "string", label: "Parent task ID" },
    { key: "position", type: "string", label: "Position among siblings" },
    { key: "webViewLink", type: "string", label: "Link to the task in Google Tasks" },
  ],

  execute(input, ctx) {
    const client = new GoogleTasksClient(ctx);
    return client.request(
      `/lists/${encodeId(input.taskList)}/tasks/${encodeId(input.task)}`,
    );
  },
};

export default getTask;
