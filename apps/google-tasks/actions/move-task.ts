import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoogleTasksClient } from "../lib/client.ts";

interface Input {
  taskList: string;
  task: string;
  parent?: string;
  previous?: string;
  destinationTasklist?: string;
}

/**
 * `tasks.move` — POST /lists/{tasklist}/tasks/{task}/move
 * https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/move
 *
 * The only way to re-nest or reorder a task: `parent` and `position` are
 * `readOnly` on the Task schema, so a patch cannot do it. All three inputs are
 * query parameters and the request body is empty.
 *
 * Omitting `parent` moves the task to the top level; omitting `previous` moves
 * it to first among its siblings.
 */
const moveTask: ActionDefinition<Input> = {
  key: "move-task",
  type: "perform",
  resource: "task",
  title: "Move Task",
  description:
    "Reposition a task: change its parent, its position among siblings, or move it to another task list.",
  // The same move repeated lands the task in the same place.
  idempotent: true,
  params: [
    { key: "taskList", label: "Task list ID", type: "string", required: true },
    { key: "task", label: "Task ID", type: "string", required: true },
    {
      key: "parent",
      label: "New parent task ID",
      type: "string",
      hint: "Omit to move the task to the top level.",
    },
    {
      key: "previous",
      label: "New previous sibling task ID",
      type: "string",
      hint: "The task to place this one after. Omit to make it first.",
    },
    {
      key: "destinationTasklist",
      label: "Destination task list ID",
      type: "string",
      hint: "Set to move the task into a different list.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "parent", type: "string", label: "Parent task ID" },
    { key: "position", type: "string", label: "Position among siblings" },
  ],

  execute(input, ctx) {
    const client = new GoogleTasksClient(ctx);
    return client.request(
      `/lists/${encodeId(input.taskList)}/tasks/${encodeId(input.task)}/move`,
      {
        method: "POST",
        query: {
          parent: input.parent,
          previous: input.previous,
          destinationTasklist: input.destinationTasklist,
        },
      },
    );
  },
};

export default moveTask;
