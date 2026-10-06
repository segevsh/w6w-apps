import type { ActionDefinition } from "@w6w/types";
import { SeamlessClient } from "../lib/client.ts";

/** `GET /api/client/v2/engagement-statuses` — List Engagement Statuses. */
type Input = Record<string, never>;

const engagementStatusesList: ActionDefinition<Input> = {
  key: "engagement-statuses-list",
  type: "read",
  resource: "activity",
  title: "List Engagement Statuses",
  description: "The engagement statuses and what triggers each.",
  params: [],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "data", type: "array", label: "Result records" },
  ],

  async execute(_input, ctx) {
    return await new SeamlessClient(ctx).request("GET", "/engagement-statuses");
  },
};

export default engagementStatusesList;
