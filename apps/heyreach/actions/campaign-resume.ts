import type { ActionDefinition } from "@w6w/types";
import { HeyReachClient } from "../lib/client.ts";
import { campaignIdParam } from "../lib/params.ts";

interface Input {
  campaignId: number;
}

/**
 * `POST /api/public/campaign/Resume?campaignId=…` — restart a paused campaign.
 *
 * The counterpart to `campaign-pause`, and safe to retry for the same reason:
 * resuming a running campaign does not start it twice, and the campaign's own
 * status is the source of truth.
 *
 * The document declares the `200` response as `Successful response` with no
 * content — precisely what a state change should look like — so this action
 * returns the status and nothing else. Read the campaign with `campaign-get` to
 * confirm the new state.
 */
const action: ActionDefinition<Input> = {
  key: "campaign-resume",
  type: "perform",
  resource: "campaign",
  title: "Resume Campaign",
  description: "Resume a paused campaign (POST /api/public/campaign/Resume).",
  idempotent: true,
  params: [campaignIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status (200 on success)" }],

  async execute(input, ctx) {
    const status = await new HeyReachClient(ctx).status("/campaign/Resume", {
      method: "POST",
      query: { campaignId: input.campaignId },
    });
    return { status };
  },
};

export default action;
