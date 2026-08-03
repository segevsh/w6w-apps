import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoogleTasksClient } from "../lib/client.ts";

interface Input {
  taskList: string;
  showCompleted?: boolean;
  showDeleted?: boolean;
  showHidden?: boolean;
  showAssigned?: boolean;
  dueMin?: string;
  dueMax?: string;
  completedMin?: string;
  completedMax?: string;
  updatedMin?: string;
  maxResults?: number;
  pageToken?: string;
}

/**
 * `tasks.list` — GET /lists/{tasklist}/tasks
 * https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/list
 *
 * Every parameter below is one Google actually defines on this method (checked
 * against the v1 discovery document). Two defaults are worth knowing about:
 * `showCompleted` defaults to true but is overridden by `showHidden` — a task
 * completed before the list was last cleared is *hidden*, so a plain call
 * returns recent completions and not old ones.
 */
const listTasks: ActionDefinition<Input> = {
  key: "list-tasks",
  type: "read",
  resource: "task",
  title: "List Tasks",
  description:
    "List tasks in a task list. Returns one page; pass `pageToken` for the next. All time bounds are RFC 3339 timestamps.",
  params: [
    { key: "taskList", label: "Task list ID", type: "string", required: true },
    {
      key: "showCompleted",
      label: "Show completed",
      type: "boolean",
      hint:
        "Google's default is true. Completed tasks that are also hidden still need `showHidden`.",
    },
    {
      key: "showDeleted",
      label: "Show deleted",
      type: "boolean",
      hint: "Google's default is false.",
    },
    {
      key: "showHidden",
      label: "Show hidden",
      type: "boolean",
      hint: "Google's default is false. Hidden = completed before the list was last cleared.",
    },
    {
      key: "showAssigned",
      label: "Show assigned",
      type: "boolean",
      hint: "Google's default is false. Includes tasks assigned to the user from Docs/Chat/Spaces.",
    },
    { key: "dueMin", label: "Due min (RFC 3339)", type: "datetime" },
    { key: "dueMax", label: "Due max (RFC 3339)", type: "datetime" },
    { key: "completedMin", label: "Completed min (RFC 3339)", type: "datetime" },
    { key: "completedMax", label: "Completed max (RFC 3339)", type: "datetime" },
    { key: "updatedMin", label: "Updated min (RFC 3339)", type: "datetime" },
    {
      key: "maxResults",
      label: "Max results",
      type: "number",
      hint: "1–100. Google's default is 20.",
      validation: { integer: true, min: 1, max: 100 },
    },
    { key: "pageToken", label: "Page token", type: "string" },
  ],
  output: [
    { key: "items", type: "array", label: "Tasks" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
    { key: "kind", type: "string", label: "Resource kind" },
  ],

  execute(input, ctx) {
    const client = new GoogleTasksClient(ctx);
    return client.request(`/lists/${encodeId(input.taskList)}/tasks`, {
      query: {
        showCompleted: input.showCompleted,
        showDeleted: input.showDeleted,
        showHidden: input.showHidden,
        showAssigned: input.showAssigned,
        dueMin: input.dueMin,
        dueMax: input.dueMax,
        completedMin: input.completedMin,
        completedMax: input.completedMax,
        updatedMin: input.updatedMin,
        maxResults: input.maxResults,
        pageToken: input.pageToken,
      },
    });
  },
};

export default listTasks;
