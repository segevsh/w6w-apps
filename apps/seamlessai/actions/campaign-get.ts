import type { ActionDefinition } from "@w6w/types";
import { SeamlessClient, segment } from "../lib/client.ts";

/** `GET /api/client/v2/campaigns/{id}` — Get Campaign. */
interface Input {
  id: string;
}

const campaignGet: ActionDefinition<Input> = {
  key: "campaign-get",
  type: "read",
  resource: "campaign",
  title: "Get Campaign",
  description: "Get one campaign.",
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
    { key: "data", type: "object", label: "The record" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request(
      "GET",
      `/campaigns/${segment(input.id, "Campaign ID")}`,
    );
  },
};

export default campaignGet;
