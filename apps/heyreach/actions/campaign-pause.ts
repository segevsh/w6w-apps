import type { ActionDefinition } from "@w6w/types";
import { HeyReachClient } from "../lib/client.ts";
import { campaignIdParam } from "../lib/params.ts";

interface Input {
  campaignId: number;
}

/**
 * `POST /api/public/campaign/Pause?campaignId=…` — stop a running campaign.
 *
 * Safe to retry (`idempotent: true`): pausing an already-paused campaign does
 * not stack anything, and the campaign's own status is the source of truth.
 *
 * The document declares a `200` body for this operation that is a *campaign
 * list page* — plainly a copy of `GetAll`'s schema, since the description is
 * just "Pauses the specified campaign" and the sibling `Resume`/`StartCampaign`
 * operations declare no body at all. It is treated here as what it is: a state
 * change with no body, so the action returns the status only. Read the campaign
 * with `campaign-get` to see the new state.
 */
const action: ActionDefinition<Input> = {
  key: "campaign-pause",
  type: "perform",
  resource: "campaign",
  title: "Pause Campaign",
  description: "Pause a running campaign (POST /api/public/campaign/Pause).",
  idempotent: true,
  params: [campaignIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status (200 on success)" }],

  async execute(input, ctx) {
    const status = await new HeyReachClient(ctx).status("/campaign/Pause", {
      method: "POST",
      query: { campaignId: input.campaignId },
    });
    return { status };
  },
};

export default action;
