import type { ActionDefinition } from "@w6w/types";
import { SeamlessClient } from "../lib/client.ts";

/** `GET /api/client/v2/lists` — List Lists. */
type Input = Record<string, never>;

const listList: ActionDefinition<Input> = {
  key: "list-list",
  type: "read",
  resource: "list",
  title: "List Lists",
  description: "List every contact / company list in the organization.",
  params: [],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "data", type: "array", label: "Result records" },
  ],

  async execute(_input, ctx) {
    return await new SeamlessClient(ctx).request("GET", "/lists");
  },
};

export default listList;
