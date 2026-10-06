import type { ActionDefinition } from "@w6w/types";
import { SeamlessClient } from "../lib/client.ts";

/** `GET /api/client/v2/credits` — Get Credits. */
type Input = Record<string, never>;

const creditsGet: ActionDefinition<Input> = {
  key: "credits-get",
  type: "read",
  resource: "account",
  title: "Get Credits",
  description: "Remaining credits per category. Does not spend credits.",
  params: [],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "data", type: "object", label: "Per-category {remaining, refreshesAt}" },
  ],

  async execute(_input, ctx) {
    return await new SeamlessClient(ctx).request("GET", "/credits");
  },
};

export default creditsGet;
