import type { ActionDefinition } from "@w6w/types";
import { need, RunwayClient } from "../lib/client.ts";
import { TERMINAL } from "./get-task.ts";

interface Input {
  id: string;
}

interface Invocation {
  id?: string;
  status?: string;
  createdAt?: string;
  progress?: number;
  output?: unknown;
  nodeErrors?: Record<string, unknown>;
  failure?: string;
  failureCode?: string;
  cost?: { credits?: number };
}

/**
 * `GET /v1/workflow_invocations/{id}`. A SUCCEEDED invocation may still have had individual
 * nodes fail — `nodeErrors` is the check, not the status (vendor note). Poll no more often
 * than every five seconds.
 */
const getWorkflowInvocation: ActionDefinition<Input> = {
  key: "get-workflow-invocation",
  type: "read",
  resource: "workflow",
  title: "Get Workflow Invocation",
  description: "Read a workflow run: status, output and per-node errors. A SUCCEEDED run can " +
    "still carry node errors.",
  params: [{ key: "id", label: "Invocation ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Invocation id" },
    {
      key: "status",
      type: "string",
      label: "PENDING, THROTTLED, RUNNING, SUCCEEDED, FAILED or CANCELLED",
    },
    { key: "done", type: "boolean", label: "Status is terminal" },
    { key: "progress", type: "number", label: "Progress 0-1 while RUNNING" },
    { key: "output", type: "object", label: "Node outputs" },
    { key: "nodeErrors", type: "object", label: "Errors by node (partial failure)" },
    { key: "hasNodeErrors", type: "boolean", label: "Any node failed" },
    { key: "failure", type: "string", label: "Failure (FAILED)" },
    { key: "failureCode", type: "string", label: "Failure code (FAILED)" },
    { key: "costCredits", type: "number", label: "Credits charged" },
  ],

  async execute(input, ctx) {
    const { data } = await new RunwayClient(ctx).request(
      `/v1/workflow_invocations/${encodeURIComponent(need(input.id, "id"))}`,
    );
    const d = (data ?? {}) as Invocation;
    return {
      id: d.id,
      status: d.status,
      done: TERMINAL.includes(d.status ?? ""),
      progress: d.progress,
      output: d.output,
      nodeErrors: d.nodeErrors,
      hasNodeErrors: Object.keys(d.nodeErrors ?? {}).length > 0,
      failure: d.failure,
      failureCode: d.failureCode,
      costCredits: d.cost?.credits,
    };
  },
};

export default getWorkflowInvocation;
