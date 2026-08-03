import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoogleTasksClient } from "../lib/client.ts";

interface Input {
  taskList: string;
}

/**
 * `tasklists.get` — GET /users/@me/lists/{tasklist}
 * https://developers.google.com/workspace/tasks/reference/rest/v1/tasklists/get
 *
 * `{tasklist}` takes a real list id — the v1 discovery document defines no
 * alias for "the default list" (`@me` is the only literal in the API, and it
 * is fixed in the path). Use `list-task-lists` to discover ids.
 */
const getTaskList: ActionDefinition<Input> = {
  key: "get-task-list",
  type: "read",
  resource: "taskList",
  title: "Get Task List",
  description: "Retrieve a single task list by ID.",
  params: [
    {
      key: "taskList",
      label: "Task list ID",
      type: "string",
      required: true,
      hint: "From `list-task-lists`.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Task list ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "updated", type: "string", label: "Last modified (RFC 3339)" },
    { key: "selfLink", type: "string", label: "Self link" },
  ],

  execute(input, ctx) {
    const client = new GoogleTasksClient(ctx);
    return client.request(`/users/@me/lists/${encodeId(input.taskList)}`);
  },
};

export default getTaskList;
