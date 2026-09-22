import type { ActionDefinition } from "@w6w/types";
import { encodeId, SendfoxClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /campaigns/{id}` — one campaign.
 *
 * Answers the bare `Campaign` entity. `scheduled_at` is null for a draft and set
 * once the campaign is queued; `sent_at` is set once it has gone out. Those two
 * fields are how a workflow tells which of the three states a campaign is in.
 */
interface Input {
  id: number;
}

const campaignGet: ActionDefinition<Input> = {
  key: "campaign-get",
  type: "read",
  resource: "campaign",
  title: "Get Campaign",
  description: "Fetch one campaign by id.",
  params: [
    idParam("id", "Campaign", "Campaign id, from List Campaigns or Create Campaign."),
  ],
  output: [
    { key: "id", type: "number", label: "Campaign id" },
    { key: "title", type: "string", label: "Internal title" },
    { key: "subject", type: "string", label: "Subject line" },
    { key: "preview_text", type: "string", label: "Inbox preview text" },
    { key: "from_name", type: "string", label: "From name" },
    { key: "from_email", type: "string", label: "From email" },
    { key: "scheduled_at", type: "string", label: "Scheduled at (null for a draft)" },
    { key: "sent_at", type: "string", label: "Sent at (null until sent)" },
    { key: "created_at", type: "string", label: "Created at" },
  ],

  execute(input, ctx) {
    return new SendfoxClient(ctx).json(`/campaigns/${encodeId(input.id)}`);
  },
};

export default campaignGet;
