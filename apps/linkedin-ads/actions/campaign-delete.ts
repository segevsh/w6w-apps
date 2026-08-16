import type { ActionDefinition } from "@w6w/types";
import { bareId, LinkedInAdsClient } from "../lib/client.ts";
import { accountIdParam, campaignIdParam } from "../lib/params.ts";

interface Input {
  accountId: string;
  campaignId: string;
  hardDelete?: boolean;
}

/**
 * Two distinct vendor operations behind one action, per
 * `create-and-manage-campaigns` § "Delete a Campaign":
 *
 * - **Hard delete** (`DELETE /rest/adAccounts/{accountId}/adCampaigns/{id}`)
 *   only succeeds on a campaign still in `DRAFT`. LinkedIn answers with its
 *   own 4xx if the campaign has left DRAFT — not guessed or pre-checked
 *   here, since a stale local read could be wrong either way.
 * - **Soft delete**, the path for anything else: a `PARTIAL_UPDATE` setting
 *   `status: PENDING_DELETION` (the same shape `campaign-update` sends).
 *   This is what "delete" means for a campaign that has ever left DRAFT.
 *
 * Defaults to the soft path — it's the one that works regardless of the
 * campaign's current status, and matches what `campaign-update` would also
 * do with `status: PENDING_DELETION`.
 */
const campaignDelete: ActionDefinition<Input> = {
  key: "campaign-delete",
  type: "perform",
  resource: "campaign",
  title: "Delete Campaign",
  description: "Delete a Campaign. Soft-deletes (sets status to Pending Deletion) by default; " +
    "hard DELETE only succeeds on a DRAFT campaign.",
  idempotent: true,
  params: [
    accountIdParam,
    campaignIdParam,
    {
      key: "hardDelete",
      label: "Hard delete (DRAFT only)",
      type: "boolean",
      hint: "Sends HTTP DELETE instead of setting status to Pending Deletion. LinkedIn only " +
        "allows this while the campaign is still in DRAFT status.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Delete accepted" }],

  async execute(input, ctx) {
    const client = new LinkedInAdsClient(ctx);
    const path = `/rest/adAccounts/${bareId(input.accountId)}/adCampaigns/${
      bareId(input.campaignId)
    }`;

    if (input.hardDelete) {
      await client.request(path, { method: "DELETE" });
    } else {
      await client.request(path, {
        method: "POST",
        restliMethod: "PARTIAL_UPDATE",
        body: { patch: { $set: { status: "PENDING_DELETION" } } },
      });
    }
    return { ok: true };
  },
};

export default campaignDelete;
