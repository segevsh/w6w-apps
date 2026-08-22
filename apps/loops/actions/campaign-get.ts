import type { ActionDefinition } from "@w6w/types";
import { LoopsClient } from "../lib/client.ts";

/**
 * `GET /v1/campaigns/{campaignId}` — verified against Loops' OpenAPI document
 * (`getCampaign`).
 */
const action: ActionDefinition = {
  key: "campaign-get",
  type: "read",
  resource: "campaign",
  title: "Get a campaign",
  description: "Retrieve one campaign, its audience and its state.",
  params: [
    { key: "campaignId", label: "Campaign ID", type: "string", required: true, default: "" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.campaignId ?? "").trim();
    if (!id) throw new Error("`campaignId` is required");

    ctx.log("info", "getting a Loops campaign", { id });

    return await new LoopsClient(ctx).request(`/campaigns/${encodeURIComponent(id)}`);
  },
};

export default action;
