import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient, one } from "../lib/client.ts";

/**
 * `GET /tasks/{taskId}` — Fetch one task; optionally with billing.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  taskId: string;
  includeBilling?: boolean;
}

const taskGet: ActionDefinition<Input> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Fetch one task; optionally with billing.",
  params: [
    {
      key: "taskId",
      label: "Task ID",
      type: "string",
      required: true,
      hint: "Everhour task id, e.g. `ev:3000010034` (or `{platform}:{id}`).",
    },
    {
      key: "includeBilling",
      label: "Include billing",
      type: "boolean",
      hint:
        "Adds `billing` (rate and amount, in cents) when your key belongs to an admin with billing permission; otherwise the vendor omits it.",
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
    return new EverhourClient(ctx).one(`/tasks/${encodeId(input.taskId)}`, {
      query: { "opts_include_billing": one(input.includeBilling) },
    });
  },
};

export default taskGet;
