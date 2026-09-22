import type { ActionDefinition } from "@w6w/types";
import { compact, HeyReachClient } from "../lib/client.ts";
import { campaignIdParam, leadFields } from "../lib/params.ts";

interface Input {
  campaignId: number;
  accountLeadPairs: Array<Record<string, unknown>>;
  resumeFinishedCampaign?: boolean;
  resumePausedCampaign?: boolean;
}

/**
 * `POST /api/public/campaign/AddLeadsToCampaignV2` — put leads into a campaign,
 * paired with the sender that will work them.
 *
 * ## A pair, not a list — that is the whole point of this shape
 *
 * HeyReach always works a lead *from a specific LinkedIn account*, so the body
 * is `accountLeadPairs: [{ linkedInAccountId, lead }]` rather than a campaign id
 * plus a flat lead list. The account must already be attached to the campaign
 * and its auth must be valid — an account whose LinkedIn session lapsed will not
 * send.
 *
 * ## The resume flags decide what happens when the campaign is not running
 *
 * `resumePausedCampaign` restarts a paused campaign so it takes the new leads,
 * and `resumeFinishedCampaign` restarts one that had already finished. With both
 * off, leads added to a campaign that is not running simply wait — the document
 * is explicit that adding to a list or a stopped campaign never starts anything.
 *
 * ## It upserts
 *
 * `idempotent: true`: re-adding a lead updates it rather than duplicating it,
 * and the response reports `addedLeadsCount` / `updatedLeadsCount` /
 * `failedLeadsCount` per call. Read `failedLeadsCount` — the call answers 200
 * even when individual leads were refused.
 *
 * The nested `lead` object is the same shape `list/AddLeadsToListV2` takes,
 * declared once in `lib/params.ts#leadFields`.
 */
const action: ActionDefinition<Input> = {
  key: "campaign-add-leads",
  type: "perform",
  resource: "campaign",
  title: "Add Leads to Campaign",
  description: "Add leads to a campaign, each paired with the LinkedIn account that will work it " +
    "(POST /api/public/campaign/AddLeadsToCampaignV2).",
  idempotent: true,
  params: [
    campaignIdParam,
    {
      key: "accountLeadPairs",
      label: "Account / lead pairs",
      type: "array",
      required: true,
      item: {
        type: "object",
        fields: [
          {
            key: "linkedInAccountId",
            label: "LinkedIn account",
            type: "number",
            required: true,
            hint: "A sender account already attached to this campaign.",
          },
          { key: "lead", label: "Lead", type: "group", children: leadFields() },
        ],
      },
      hint: "One entry per lead, each naming the account that sends to it.",
    },
    {
      key: "resumePausedCampaign",
      label: "Resume a paused campaign",
      type: "boolean",
      hint: "Restart the campaign if it is paused, so the new leads start immediately. " +
        "Defaults to false.",
    },
    {
      key: "resumeFinishedCampaign",
      label: "Resume a finished campaign",
      type: "boolean",
      hint: "Restart the campaign if it has already finished. Defaults to false.",
    },
  ],
  output: [
    { key: "addedLeadsCount", type: "number", label: "Leads added" },
    { key: "updatedLeadsCount", type: "number", label: "Leads updated" },
    { key: "failedLeadsCount", type: "number", label: "Leads rejected" },
  ],

  execute(input, ctx) {
    return new HeyReachClient(ctx).request("/campaign/AddLeadsToCampaignV2", {
      method: "POST",
      body: compact({
        campaignId: input.campaignId,
        accountLeadPairs: input.accountLeadPairs,
        resumePausedCampaign: input.resumePausedCampaign,
        resumeFinishedCampaign: input.resumeFinishedCampaign,
      }),
    });
  },
};

export default action;
