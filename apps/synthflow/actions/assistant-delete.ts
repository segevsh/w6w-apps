import type { ActionDefinition } from "@w6w/types";
import { SynthflowClient } from "../lib/client.ts";

interface Input {
  model_id: string;
}

const assistantDelete: ActionDefinition<Input> = {
  key: "assistant-delete",
  type: "perform",
  resource: "agent",
  title: "Delete Agent",
  description: "Permanently delete an agent.",
  idempotent: true,
  params: [
    {
      key: "model_id",
      label: "Agent ID",
      type: "string",
      required: true,
      hint: "Deletion is permanent.",
    },
  ],
  output: [{ key: "answer", type: "string", label: "Result message" }],

  async execute(input, ctx) {
    return await new SynthflowClient(ctx).data<Record<string, unknown>>(
      `/assistants/${encodeURIComponent(input.model_id)}`,
      { method: "DELETE" },
    );
  },
};

export default assistantDelete;
