import type { ActionDefinition } from "@w6w/types";
import { HibobClient } from "../lib/client.ts";

/** `GET /v1/tasks` — all open tasks for the company (up to 5,000 per request). */
const tasksList: ActionDefinition<Record<string, never>> = {
  key: "tasks-list",
  type: "read",
  resource: "task",
  title: "List Open Tasks",
  description: "List all open tasks in the company (Bob caps one response at 5,000).",
  params: [],
  output: [{
    key: "tasks",
    type: "array",
    label: "Tasks (id, title, owner, requestedFor, due, status)",
  }],

  async execute(_input, ctx) {
    return await new HibobClient(ctx).get("/tasks");
  },
};

export default tasksList;
