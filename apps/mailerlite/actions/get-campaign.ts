import type { ActionDefinition } from "@w6w/types";
import { MailerLiteClient, type MailerLiteEnvelope } from "../lib/client.ts";

interface Input {
  campaignId: string;
}

/** `GET /api/campaigns/{campaign_id}`. */
const getCampaign: ActionDefinition<Input> = {
  key: "get-campaign",
  type: "read",
  resource: "campaign",
  title: "Get Campaign",
  description: "Fetch a single campaign, including its emails, filter and delivery schedule.",
  params: [
    { key: "campaignId", label: "Campaign ID", type: "string", required: true },
  ],
  output: [{ key: "data", type: "object", label: "Campaign" }],

  execute(input, ctx) {
    const client = new MailerLiteClient(ctx);
    return client.request<MailerLiteEnvelope>(
      `/campaigns/${encodeURIComponent(input.campaignId)}`,
    );
  },
};

export default getCampaign;
