import type { ActionDefinition } from "@w6w/types";
import { call, V2 } from "../lib/client.ts";
import { int } from "../lib/params.ts";

type Input = {
  limit?: number;
};

const manualTaskList: ActionDefinition<Input> = {
  key: "manual-task-list",
  type: "read",
  resource: "manual_task",
  title: "List Manual Tasks",
  description:
    "List pending manual tasks (manual steps of multichannel campaigns) with their prospect.",
  params: [
    int("limit", "Limit", { hint: "Results to return. Default and maximum 500." }),
  ],
  output: [
    { key: "tasks", type: "array", label: "Manual tasks, each with its prospect" },
    { key: "count", type: "number", label: "Tasks returned" },
  ],

  async execute(input, ctx) {
    const body = await call(ctx, "GET", V2, "/manual_tasks", { query: { limit: input.limit } });
    const tasks = Array.isArray(body) ? body : [];
    return { tasks, count: tasks.length };
  },
};

export default manualTaskList;
