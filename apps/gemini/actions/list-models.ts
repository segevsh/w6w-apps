import type { ActionDefinition } from "@w6w/types";
import { GeminiClient } from "../lib/client.ts";

interface Input {
  pageSize?: number;
  pageToken?: string;
}

const listModels: ActionDefinition<Input> = {
  key: "list-models",
  type: "read",
  resource: "model",
  title: "List Models",
  description: "List the models available through the Gemini Developer API.",
  params: [
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      hint: "Defaults to 50 server-side; the API caps at 1000.",
    },
    { key: "pageToken", label: "Page token", type: "string" },
  ],
  output: [
    { key: "models", type: "array", label: "Models" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  execute(input, ctx) {
    const client = new GeminiClient(ctx);
    return client.request("/models", {
      query: { pageSize: input.pageSize, pageToken: input.pageToken },
    });
  },
};

export default listModels;
