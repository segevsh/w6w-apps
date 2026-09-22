import type { ActionDefinition } from "@w6w/types";
import { HeyReachClient } from "../lib/client.ts";
import { campaignIdParam } from "../lib/params.ts";

interface Input {
  campaignId: number;
}

/**
 * `GET /api/public/campaign/GetCampaignSequence?campaignId=…` — the campaign's
 * workflow.
 *
 * `campaignId` is a query parameter, and the response is the sequence node
 * object the campaign runs: `nodeType`, `actionDelay` + `actionDelayUnit`, a
 * `payload` (messages, fallback message, InMail withdrawal window), and the
 * `conditionalNode` / `unconditionalNode` branches.
 *
 * The document states that the returned object is **directly reusable** as the
 * `sequence` field of `campaign/Create` or `UpdateSequence`, which is what makes
 * this action worth having even though this app does not implement those
 * updates: it is how a workflow reads (and could clone) the exact sequence a
 * campaign is running.
 *
 * A campaign with no sequence answers an **empty 200**, so the result is
 * `undefined` rather than an object — check before reading fields.
 */
const action: ActionDefinition<Input> = {
  key: "campaign-get-sequence",
  type: "read",
  resource: "campaign",
  title: "Get Campaign Sequence",
  description: "Read a campaign's sequence node object — the exact shape the campaign runs " +
    "(GET /api/public/campaign/GetCampaignSequence).",
  params: [campaignIdParam],
  output: [
    { key: "nodeType", type: "string", label: "Root node type" },
    { key: "actionDelay", type: "number", label: "Delay before the next node" },
    { key: "actionDelayUnit", type: "string", label: "Delay unit" },
    { key: "payload", type: "object", label: "Node payload (messages and window)" },
    { key: "conditionalNode", type: "object", label: "Conditional branch" },
    { key: "unconditionalNode", type: "object", label: "Unconditional branch" },
  ],

  execute(input, ctx) {
    return new HeyReachClient(ctx).request("/campaign/GetCampaignSequence", {
      query: { campaignId: input.campaignId },
    });
  },
};

export default action;
