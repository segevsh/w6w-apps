import type { ActionDefinition } from "@w6w/types";
import { GoogleTasksClient } from "../lib/client.ts";

interface Input {
  title: string;
}

/**
 * `tasklists.insert` — POST /users/@me/lists
 * https://developers.google.com/workspace/tasks/reference/rest/v1/tasklists/insert
 *
 * `title` is the only writable field on a TaskList; everything else on the
 * resource (`id`, `kind`, `etag`, `updated`, `selfLink`) is output only.
 */
const createTaskList: ActionDefinition<Input> = {
  key: "create-task-list",
  type: "perform",
  resource: "taskList",
  title: "Create Task List",
  description: "Create a new task list for the authenticated user.",
  // Google issues a fresh list id per call, so a retry creates a duplicate.
  idempotent: false,
  params: [
    {
      key: "title",
      label: "Title",
      type: "string",
      required: true,
      hint: "Maximum 1024 characters.",
      validation: { maxLength: 1024 },
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
    return client.request("/users/@me/lists", {
      method: "POST",
      body: { title: input.title },
    });
  },
};

export default createTaskList;
