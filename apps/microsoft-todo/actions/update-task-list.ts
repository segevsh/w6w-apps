import type { ActionDefinition } from "@w6w/types";
import { encodeId, GraphClient } from "../lib/client.ts";
import { taskListParam } from "../lib/params.ts";

interface Input {
  taskList: string;
  displayName: string;
}

/**
 * `PATCH /me/todo/lists/{todoTaskListId}`
 * https://learn.microsoft.com/en-us/graph/api/todotasklist-update?view=graph-rest-1.0
 *
 * Renaming is the only update a list supports — every other property on
 * `todoTaskList` is server-determined.
 *
 * **The built-in lists cannot be renamed.** Microsoft states it on the
 * `todoTaskList` resource: "there are built-in task lists such as Flagged emails
 * and Tasks which cannot be renamed or deleted". Check `wellknownListName`
 * (via Get Task List) before calling this on an unknown id — Graph answers with
 * an error rather than silently doing nothing.
 *
 * Least privileged permission: `Tasks.ReadWrite`.
 */
const updateTaskList: ActionDefinition<Input> = {
  key: "update-task-list",
  type: "perform",
  resource: "task-list",
  title: "Update Task List",
  description: "Rename a To Do list. The built-in Tasks and Flagged email lists cannot be renamed.",
  // Setting the same name twice leaves the same name.
  idempotent: true,
  params: [
    taskListParam,
    {
      key: "displayName",
      label: "Name",
      type: "string",
      required: true,
      hint: "The only writable property on a task list.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Task list ID" },
    { key: "displayName", type: "string", label: "Name" },
    { key: "wellknownListName", type: "string", label: "Well-known list name" },
  ],

  execute(input, ctx) {
    const client = new GraphClient(ctx);
    return client.request(`/me/todo/lists/${encodeId(input.taskList)}`, {
      method: "PATCH",
      body: { displayName: input.displayName },
    });
  },
};

export default updateTaskList;
