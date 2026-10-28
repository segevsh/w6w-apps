import type { ActionDefinition } from "@w6w/types";
import { GeminiClient, modelResource } from "../lib/client.ts";

interface Input {
  model: string;
}

const getModel: ActionDefinition<Input> = {
  key: "get-model",
  type: "read",
  resource: "model",
  title: "Get Model",
  description: "Get metadata for a single model — token limits, supported methods, defaults.",
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      hint: 'Bare id ("gemini-3.5-flash") or full name ("models/gemini-3.5-flash").',
    },
  ],
  output: [
    { key: "name", type: "string", label: "Name" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "inputTokenLimit", type: "number", label: "Input token limit" },
    { key: "outputTokenLimit", type: "number", label: "Output token limit" },
  ],

  execute(input, ctx) {
    const client = new GeminiClient(ctx);
    return client.request(`/${modelResource(input.model)}`);
  },
};

export default getModel;
