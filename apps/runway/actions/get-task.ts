import type { ActionDefinition } from "@w6w/types";
import { need, RunwayClient } from "../lib/client.ts";

interface Input {
  taskId: string;
}

interface Task {
  id?: string;
  status?: string;
  createdAt?: string;
  progress?: number;
  output?: string[];
  failure?: string;
  failureCode?: string;
  cost?: { credits?: number };
  estimatedCost?: { credits?: number };
}

/** The statuses after which a task never changes (OpenAPI `GET /v1/tasks/{id}`, 2026-10-06). */
export const TERMINAL = ["SUCCEEDED", "FAILED", "CANCELLED"];

/**
 * `GET /v1/tasks/{id}`. The vendor says not to expect updates more often than once every five
 * seconds. Only a SUCCEEDED task carries `output` (temporary URLs); a FAILED one carries
 * `failure` / `failureCode` — content moderation is a FAILED task, not an HTTP error. THROTTLED
 * is a queue, not an error.
 */
const getTask: ActionDefinition<Input> = {
  key: "get-task",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Read a generation task: status, progress, cost and, once SUCCEEDED, the " +
    "temporary output URLs. Poll no more often than every five seconds.",
  params: [{
    key: "taskId",
    label: "Task ID",
    type: "string",
    required: true,
    hint: "The id a generation action returned.",
  }],
  output: [
    { key: "id", type: "string", label: "Task id" },
    {
      key: "status",
      type: "string",
      label: "PENDING, THROTTLED, RUNNING, SUCCEEDED, FAILED or CANCELLED",
    },
    { key: "done", type: "boolean", label: "Status is terminal (SUCCEEDED, FAILED or CANCELLED)" },
    { key: "progress", type: "number", label: "Progress 0-1 while RUNNING" },
    { key: "output", type: "array", label: "Temporary output URLs (SUCCEEDED)" },
    { key: "failure", type: "string", label: "Human-readable failure (FAILED)" },
    { key: "failureCode", type: "string", label: "Machine-readable failure code (FAILED)" },
    { key: "costCredits", type: "number", label: "Credits charged (finished tasks)" },
    { key: "estimatedCostCredits", type: "number", label: "Estimated credits (unfinished tasks)" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    const { data } = await new RunwayClient(ctx).request(
      `/v1/tasks/${encodeURIComponent(need(input.taskId, "taskId"))}`,
    );
    const t = (data ?? {}) as Task;
    return {
      id: t.id,
      status: t.status,
      done: TERMINAL.includes(t.status ?? ""),
      progress: t.progress,
      output: t.output,
      failure: t.failure,
      failureCode: t.failureCode,
      costCredits: t.cost?.credits,
      estimatedCostCredits: t.estimatedCost?.credits,
      createdAt: t.createdAt,
    };
  },
};

export default getTask;
