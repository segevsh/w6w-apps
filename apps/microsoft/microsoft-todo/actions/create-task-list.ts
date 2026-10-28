import type { ActionDefinition } from "@w6w/types";
import { GraphClient } from "../lib/client.ts";

interface Input {
  displayName: string;
}

/**
 * `POST /me/todo/lists`
 * https://learn.microsoft.com/en-us/graph/api/todo-post-lists?view=graph-rest-1.0
 *
 * `displayName` is the only writable property on a new list — `isOwner`,
 * `isShared` and `wellknownListName` are all server-determined, and a new list
 * is always `wellknownListName: "none"`.
 *
 * Least privileged permission: `Tasks.ReadWrite`.
 */
const createTaskList: ActionDefinition<Input> = {
  key: "create-task-list",
  type: "perform",
  resource: "task-list",
  title: "Create Task List",
  description: "Create a new To Do list.",
  // Graph mints a fresh id per call and does not deduplicate on name, so a
  // retry creates a second list with the same title.
  idempotent: false,
  params: [
    {
      key: "displayName",
      label: "Name",
      type: "string",
      required: true,
      hint: "Graph does not enforce uniqueness — two lists may share a name.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Task list ID" },
    { key: "displayName", type: "string", label: "Name" },
    { key: "wellknownListName", type: "string", label: "Well-known list name" },
  ],

  execute(input, ctx) {
    const client = new GraphClient(ctx);
    return client.request("/me/todo/lists", {
      method: "POST",
      body: { displayName: input.displayName },
    });
  },
};

export default createTaskList;
