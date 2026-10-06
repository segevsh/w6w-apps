import type { ActionDefinition } from "@w6w/types";
import { jsonInput, need, RunwayClient } from "../lib/client.ts";

interface Input {
  id: string;
  nodeOutputs?: unknown;
}

/**
 * `POST /v1/workflows/{id}` — `{ nodeOutputs? }` overrides node inputs of the saved graph
 * (keys are the graph's node ids; the shape is workflow-specific, see Get Workflow). Answers
 * `{ id }`: a workflow invocation id, read with Get Workflow Invocation (not Get Task).
 */
const runWorkflow: ActionDefinition<Input> = {
  key: "run-workflow",
  type: "perform",
  idempotent: false,
  resource: "workflow",
  title: "Run Workflow",
  description: "Run a published workflow version. Returns an invocation id; read it with " +
    "Get Workflow Invocation. Spends credits.",
  params: [
    { key: "id", label: "Workflow version ID", type: "string", required: true },
    {
      key: "nodeOutputs",
      label: "Node outputs (JSON)",
      type: "json",
      hint: "Optional overrides of the graph's node inputs, keyed by node id.",
    },
  ],
  output: [{ key: "invocationId", type: "string", label: "Workflow invocation id" }],

  async execute(input, ctx) {
    const nodeOutputs = jsonInput(input.nodeOutputs, "nodeOutputs");
    const { data } = await new RunwayClient(ctx).request(
      `/v1/workflows/${encodeURIComponent(need(input.id, "id"))}`,
      { method: "POST", body: nodeOutputs === undefined ? {} : { nodeOutputs } },
    );
    return { invocationId: (data as { id?: string } | undefined)?.id };
  },
};

export default runWorkflow;
