import type { ActionDefinition } from "@w6w/types";
import { asArray, SynthflowClient } from "../lib/client.ts";

interface Input {
  model_id: string;
  include_actions?: boolean;
}

const assistantGet: ActionDefinition<Input> = {
  key: "assistant-get",
  type: "read",
  resource: "agent",
  title: "Get Agent",
  description: "Read one agent's full configuration by id.",
  params: [
    {
      key: "model_id",
      label: "Agent ID",
      type: "string",
      required: true,
      hint: "The agent's model_id, shown on its page in the dashboard.",
    },
    {
      key: "include_actions",
      label: "Include actions",
      type: "boolean",
      hint: "Also return the ids of attached actions and their input variables.",
    },
  ],
  output: [{ key: "assistant", type: "object", label: "Agent" }],

  async execute(input, ctx) {
    const r = await new SynthflowClient(ctx).data<Record<string, unknown>>(
      `/assistants/${encodeURIComponent(input.model_id)}`,
      { query: { include_actions: input.include_actions } },
    );
    return { assistant: asArray(r.assistants)[0] ?? null };
  },
};

export default assistantGet;
