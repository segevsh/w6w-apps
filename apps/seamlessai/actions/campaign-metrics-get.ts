import type { ActionDefinition } from "@w6w/types";
import { SeamlessClient, segment } from "../lib/client.ts";

/** `GET /api/client/v2/campaigns/{id}/metrics` — Get Campaign Metrics. */
interface Input {
  id: string;
}

const campaignMetricsGet: ActionDefinition<Input> = {
  key: "campaign-metrics-get",
  type: "read",
  resource: "campaign",
  title: "Get Campaign Metrics",
  description: "Per-step send, open, bounce, reply and call metrics for a campaign.",
  params: [
    {
      key: "id",
      label: "Campaign ID",
      type: "string",
      required: true,
      hint: "Campaign ID from the matching list action.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "data", type: "array", label: "Result records" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request(
      "GET",
      `/campaigns/${segment(input.id, "Campaign ID")}/metrics`,
    );
  },
};

export default campaignMetricsGet;
