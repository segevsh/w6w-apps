import type { ActionDefinition } from "@w6w/types";
import { LemlistClient } from "../lib/client.ts";

interface Input {
  campaignId: string;
  leadId: string;
  action?: "remove";
}

/**
 * `DELETE /campaigns/{campaignId}/leads/{leadId}`.
 *
 * ## One endpoint, two very different outcomes
 *
 * lemlist overloads this route, and its own page is blunt about it: "You need to
 * specify `action=remove` in the params to delete a lead. If you don't specify
 * `action=remove`, the endpoint fallbacks to unsubscribing the lead and to do so
 * you need to provide the lead email."
 *
 * So omitting `action` does **not** delete — it unsubscribes, which adds the
 * address to the team-wide unsubscribe list and stops every future campaign
 * reaching it. That is a much larger, much less reversible action than the one
 * the verb suggests. The param therefore defaults to `remove` here: an action
 * called "Delete Lead from Campaign" that silently unsubscribed instead would be
 * the worst kind of surprise. Clear it deliberately to get the unsubscribe
 * behaviour, and pass the lead's **email** as the identifier when you do.
 *
 * `idempotent: true`: deleting an already-deleted lead is a 404, not a second
 * destructive effect, so a retry cannot compound.
 */
const deleteLeadFromCampaign: ActionDefinition<Input> = {
  key: "delete-lead-from-campaign",
  type: "perform",
  resource: "lead",
  title: "Delete Lead from Campaign",
  description:
    "Remove a lead from a campaign. Defaults to a true delete (`action=remove`); clearing Action makes lemlist UNSUBSCRIBE the lead instead, which is team-wide.",
  idempotent: true,
  params: [
    {
      key: "campaignId",
      label: "Campaign id",
      type: "string",
      required: true,
      placeholder: "cam_A1B2C3D4E5F6G7H8I9",
    },
    {
      key: "leadId",
      label: "Lead id or email",
      type: "string",
      required: true,
      placeholder: "lea_8xJSc7sV7ggpiVnXe",
      hint: "A lead id for a delete. lemlist requires the lead's EMAIL instead when Action is " +
        "cleared, because that path unsubscribes rather than deletes.",
    },
    {
      key: "action",
      label: "Action",
      type: "select",
      options: [{ value: "remove", label: "Remove (hard delete)" }],
      default: "remove",
      hint: "Kept at `remove` so this really deletes. Clear it and lemlist falls back to " +
        "UNSUBSCRIBING the lead — team-wide, affecting every future campaign.",
    },
  ],
  output: [
    { key: "_id", type: "string", label: "Lead id" },
    { key: "email", type: "string", label: "Email" },
    { key: "campaignId", type: "string", label: "Campaign id" },
  ],

  execute(input, ctx) {
    return new LemlistClient(ctx).request(
      `/campaigns/${encodeURIComponent(input.campaignId)}/leads/${
        encodeURIComponent(input.leadId)
      }`,
      { method: "DELETE", query: { action: input.action } },
    );
  },
};

export default deleteLeadFromCampaign;
