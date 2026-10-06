import type { ActionDefinition } from "@w6w/types";
import { SeamlessClient } from "../lib/client.ts";

/** `GET /api/client/v2/calls/sentiments` — List Call Sentiments. */
type Input = Record<string, never>;

const callSentimentsList: ActionDefinition<Input> = {
  key: "call-sentiments-list",
  type: "read",
  resource: "call",
  title: "List Call Sentiments",
  description: "The sentiments a logged call can carry.",
  params: [],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "data", type: "array", label: "Result records" },
  ],

  async execute(_input, ctx) {
    return await new SeamlessClient(ctx).request("GET", "/calls/sentiments");
  },
};

export default callSentimentsList;
