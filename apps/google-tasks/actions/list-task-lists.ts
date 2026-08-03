import type { ActionDefinition } from "@w6w/types";
import { GoogleTasksClient } from "../lib/client.ts";

interface Input {
  maxResults?: number;
  pageToken?: string;
}

/**
 * `tasklists.list` — GET /users/@me/lists
 * https://developers.google.com/workspace/tasks/reference/rest/v1/tasklists/list
 *
 * Google documents exactly two query parameters here: `maxResults` (default
 * 1000, max 1000) and `pageToken`. Reachable with `tasks.readonly`.
 */
const listTaskLists: ActionDefinition<Input> = {
  key: "list-task-lists",
  type: "read",
  resource: "taskList",
  title: "List Task Lists",
  description:
    "List the authenticated user's task lists. Returns one page; pass `pageToken` for the next.",
  params: [
    {
      key: "maxResults",
      label: "Max results",
      type: "number",
      hint: "1–1000. Google's default is 1000.",
      validation: { integer: true, min: 1, max: 1000 },
    },
    { key: "pageToken", label: "Page token", type: "string" },
  ],
  output: [
    { key: "items", type: "array", label: "Task lists" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
    { key: "kind", type: "string", label: "Resource kind" },
  ],

  execute(input, ctx) {
    const client = new GoogleTasksClient(ctx);
    return client.request("/users/@me/lists", {
      query: {
        maxResults: input.maxResults,
        pageToken: input.pageToken,
      },
    });
  },
};

export default listTaskLists;
