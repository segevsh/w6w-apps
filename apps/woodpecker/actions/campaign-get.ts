import type { ActionDefinition } from "@w6w/types";
import { call, encodeId, V2 } from "../lib/client.ts";
import { campaignId } from "../lib/params.ts";

type Input = {
  campaign_id: string;
};

const campaignGet: ActionDefinition<Input> = {
  key: "campaign-get",
  type: "read",
  resource: "campaign",
  title: "Get Campaign",
  description: "Fetch a campaign's settings, attached mailboxes and the content of every step.",
  params: [
    campaignId,
  ],
  output: [
    { key: "id", type: "number", label: "Campaign ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "email_account_ids", type: "array", label: "Attached mailbox IDs" },
    { key: "settings", type: "object", label: "Campaign settings" },
    { key: "steps", type: "object", label: "Step tree: START -> followup chain" },
  ],

  async execute(input, ctx) {
    return (await call(ctx, "GET", V2, `/campaigns/${encodeId(input.campaign_id)}`)) as Record<
      string,
      unknown
    >;
  },
};

export default campaignGet;
