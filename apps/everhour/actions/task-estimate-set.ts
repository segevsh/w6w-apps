import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, EverhourClient, toObject } from "../lib/client.ts";

/**
 * `PUT /tasks/{taskId}/estimate` — Set a task's time estimate, overall or per user.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  taskId: string;
  total: number;
  type: string;
  users?: unknown;
}

const taskEstimateSet: ActionDefinition<Input> = {
  key: "task-estimate-set",
  type: "perform",
  resource: "task",
  title: "Set Task Estimate",
  description: "Set a task's time estimate, overall or per user.",
  idempotent: true,
  params: [
    {
      key: "taskId",
      label: "Task ID",
      type: "string",
      required: true,
      hint: "Everhour task id, e.g. `ev:3000010034` (or `{platform}:{id}`).",
    },
    {
      key: "total",
      label: "Total estimate",
      type: "number",
      required: true,
      hint: "Total estimate in seconds.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      options: [{ value: "overall", label: "overall" }, { value: "users", label: "users" }],
      hint: "`overall` or per-`users`.",
    },
    {
      key: "users",
      label: "Per-user estimates",
      type: "json",
      hint: 'JSON `{"1304": 3600}` (user id -> seconds); for type `users`.',
    },
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "open or closed" },
    { key: "time", type: "object", label: "Tracked time" },
    { key: "estimate", type: "object", label: "Estimate" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/tasks/${encodeId(input.taskId)}/estimate`, {
      method: "PUT",
      body: compact({
        total: input.total,
        type: input.type,
        users: toObject(input.users, "users"),
      }),
    });
  },
};

export default taskEstimateSet;
