import type { ActionDefinition } from "@w6w/types";
import { HeyReachClient } from "../lib/client.ts";
import { campaignIdParam } from "../lib/params.ts";

interface Input {
  campaignId: number;
}

/**
 * `POST /api/public/campaign/StartCampaign?campaignId=…` — activate a campaign.
 *
 * The campaign must have a valid sequence and at least one connected LinkedIn
 * sender account, so the document's own error table is the interesting part:
 * a `400` means the campaign's status, schedule, list or accounts are not
 * usable, and a `404` means it does not exist. There is no body.
 *
 * ## Retrying it
 *
 * Starting is a state transition, not a stack of side effects: a campaign that
 * is already running is not started twice. The retry may therefore answer `400`
 * ("invalid status") while the outreach itself is fine — read the campaign
 * afterwards rather than assuming the retry failed.
 */
const action: ActionDefinition<Input> = {
  key: "campaign-start",
  type: "perform",
  resource: "campaign",
  title: "Start Campaign",
  description: "Activate a DRAFT campaign so its sequence begins running " +
    "(POST /api/public/campaign/StartCampaign).",
  idempotent: true,
  params: [campaignIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status (200 on success)" }],

  async execute(input, ctx) {
    const status = await new HeyReachClient(ctx).status("/campaign/StartCampaign", {
      method: "POST",
      query: { campaignId: input.campaignId },
    });
    return { status };
  },
};

export default action;
