import type { ActionDefinition } from "@w6w/types";
import { encodeId, GraphClient, odataList } from "../lib/client.ts";
import { selectParam, taskListParam } from "../lib/params.ts";

interface Input {
  taskList: string;
  select?: string[];
}

/**
 * `GET /me/todo/lists/{todoTaskListId}`
 * https://learn.microsoft.com/en-us/graph/api/todotasklist-get?view=graph-rest-1.0
 *
 * One list's properties. Useful mostly to resolve a stored id back to a name,
 * and to read `wellknownListName` before attempting a rename or delete.
 *
 * Least privileged permission: `Tasks.Read`.
 */
const getTaskList: ActionDefinition<Input> = {
  key: "get-task-list",
  type: "read",
  resource: "task-list",
  title: "Get Task List",
  description: "Read one To Do list's properties by id.",
  params: [taskListParam, selectParam()],
  output: [
    { key: "id", type: "string", label: "Task list ID" },
    { key: "displayName", type: "string", label: "Name" },
    { key: "isOwner", type: "boolean", label: "Owned by the signed-in user" },
    { key: "isShared", type: "boolean", label: "Shared with others" },
    { key: "wellknownListName", type: "string", label: "Well-known list name" },
  ],

  execute(input, ctx) {
    const client = new GraphClient(ctx);
    return client.request(`/me/todo/lists/${encodeId(input.taskList)}`, {
      query: { $select: odataList(input.select) },
    });
  },
};

export default getTaskList;
