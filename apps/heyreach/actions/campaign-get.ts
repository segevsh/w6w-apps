import type { ActionDefinition } from "@w6w/types";
import { HeyReachClient } from "../lib/client.ts";
import { campaignIdParam } from "../lib/params.ts";

interface Input {
  campaignId: number;
}

/**
 * `GET /api/public/campaign/GetById?campaignId=…` — one campaign.
 *
 * `campaignId` is a **query parameter** here, and a body/query parameter
 * depending on the operation elsewhere in this app — the document is not
 * consistent about it, so each action states which it uses.
 *
 * This is the read that answers "what is this campaign doing right now": its
 * `status`, its `progressStats` (including `totalUsersManuallyStopped` and
 * `totalUsersExcluded`, which the list response does not carry), the sender
 * accounts attached, the list it draws from, the organization unit, and the
 * four `exclude*` booleans.
 */
const action: ActionDefinition<Input> = {
  key: "campaign-get",
  type: "read",
  resource: "campaign",
  title: "Get Campaign",
  description:
    "Fetch one campaign with its status, progress statistics, sender accounts and exclusion " +
    "rules (GET /api/public/campaign/GetById).",
  params: [campaignIdParam],
  output: [
    { key: "id", type: "number", label: "Campaign ID" },
    { key: "name", type: "string", label: "Campaign name" },
    { key: "status", type: "string", label: "Status" },
    { key: "creationTime", type: "string", label: "Created at" },
    { key: "campaignAccountIds", type: "array", label: "Sender accounts" },
    { key: "progressStats", type: "object", label: "Lead progress" },
    { key: "organizationUnitId", type: "number", label: "Organization unit" },
  ],

  execute(input, ctx) {
    return new HeyReachClient(ctx).request("/campaign/GetById", {
      query: { campaignId: input.campaignId },
    });
  },
};

export default action;
