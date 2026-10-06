import type { ActionDefinition } from "@w6w/types";
import { SeamlessClient } from "../lib/client.ts";

/** `GET /api/client/v2/features` — Get Feature Access. */
type Input = Record<string, never>;

const featuresGet: ActionDefinition<Input> = {
  key: "features-get",
  type: "read",
  resource: "account",
  title: "Get Feature Access",
  description: "Which product features (Engage, campaigns, …) this account may use.",
  params: [],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "data", type: "object", label: "Feature flags" },
  ],

  async execute(_input, ctx) {
    return await new SeamlessClient(ctx).request("GET", "/features");
  },
};

export default featuresGet;
