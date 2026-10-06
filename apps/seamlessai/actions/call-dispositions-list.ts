import type { ActionDefinition } from "@w6w/types";
import { SeamlessClient } from "../lib/client.ts";

/** `GET /api/client/v2/calls/dispositions` — List Call Dispositions. */
type Input = Record<string, never>;

const callDispositionsList: ActionDefinition<Input> = {
  key: "call-dispositions-list",
  type: "read",
  resource: "call",
  title: "List Call Dispositions",
  description: "The dispositions a logged call can carry.",
  params: [],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "data", type: "array", label: "Result records" },
  ],

  async execute(_input, ctx) {
    return await new SeamlessClient(ctx).request("GET", "/calls/dispositions");
  },
};

export default callDispositionsList;
