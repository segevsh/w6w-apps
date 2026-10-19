import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  operations: unknown[];
}

/** POST /v1/agents/batch — agent-batch. */
const action: ActionDefinition<Input> = {
  key: "batch-manage-agents",
  type: "perform",
  resource: "agent",
  title: "Batch Manage Agents",
  description: "Apply many agent operations.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "id", "type": "string", "label": "Id" },
    { "key": "status_url", "type": "string", "label": "Status url" },
    { "key": "created_time", "type": "string", "label": "Created time" },
    { "key": "operation", "type": "object", "label": "Operation" },
    { "key": "status", "type": "string", "label": "Status" },
    { "key": "poll_after_seconds", "type": "number", "label": "Poll after seconds" },
  ],
  idempotent: false,
  params: [{
    "key": "operations",
    "label": "Operations",
    "type": "json",
    "required": true,
    "hint":
      "The operations to apply, at least one and at most 100. Operations are applied in the order given, and the batch is not atomic: each operation succeeds or fails on its own, and per-operation outcomes are reported in the async task's result.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/agents/batch`, {
      method: "POST",
      body: {
        "operations": input.operations,
      },
    });
  },
};

export default action;
