import type { ActionDefinition } from "@w6w/types";
import { ClientifyClient } from "../lib/client.ts";

/**
 * `GET /v1/tasks/types` — List the task types available to the account (call, email, …); their URLs are what Create Task's `taskType` takes.
 */
type Input = Record<string, never>;

const taskTypeList: ActionDefinition<Input, unknown> = {
  key: "task-type-list",
  type: "read",
  resource: "task",
  title: "List Task Types",
  description:
    "List the task types available to the account (call, email, \u2026); their URLs are what Create Task's `taskType` takes.",
  params: [],
  output: [
    { key: "count", type: "number", label: "Total matches" },
    { key: "next", type: "string", label: "URL of the next page, or null" },
    { key: "previous", type: "string", label: "URL of the previous page, or null" },
    { key: "results", type: "array", label: "Records on this page" },
  ],

  execute(_input, ctx) {
    const client = new ClientifyClient(ctx);
    return client.request(`/v1/tasks/types`, { method: "GET" });
  },
};

export default taskTypeList;
