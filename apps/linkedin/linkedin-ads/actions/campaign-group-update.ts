import type { ActionDefinition } from "@w6w/types";
import { bareId, compact, LinkedInAdsClient, restliList } from "../lib/client.ts";
import {
  accountIdParam,
  campaignGroupIdParam,
  campaignGroupStatusOptions,
  moneyParams,
} from "../lib/params.ts";

interface Input {
  accountId: string;
  campaignGroupId: string;
  name?: string;
  status?: string;
  totalBudgetAmount?: number;
  totalBudgetCurrency?: string;
}

/**
 * `POST /rest/adAccounts/{accountId}/adCampaignGroups?ids=List({id})`, header
 * `X-RestLi-Method: BATCH_PARTIAL_UPDATE`, body `{ entities: { [id]: { patch:
 * { $set: {...} } } } }` — Campaign Groups document **no plain single-item
 * PARTIAL_UPDATE**, only this batch form (see `lib/client.ts` for the full
 * finding). Sent here as a batch of exactly one.
 *
 * To delete a non-DRAFT Campaign Group, set Status to "Pending deletion" —
 * LinkedIn's delete flow for a non-DRAFT group IS this same partial-update
 * call with `status: PENDING_DELETION`; there's no separate delete verb for
 * anything past DRAFT.
 *
 * If the account is ENTERPRISE, the vendor notes only `name` and `status`
 * are mutable on a non-default group, and the *default* group (`backfilled:
 * true`) can't be updated through the API at all.
 */
const campaignGroupUpdate: ActionDefinition<Input> = {
  key: "campaign-group-update",
  type: "perform",
  resource: "campaign-group",
  title: "Update Campaign Group",
  description: "Partially update a Campaign Group's name, status or total budget. Only the " +
    "fields you set are changed.",
  idempotent: true,
  params: [
    accountIdParam,
    campaignGroupIdParam,
    { key: "name", label: "New name", type: "string" },
    {
      key: "status",
      label: "New status",
      type: "select",
      options: campaignGroupStatusOptions.filter((o) => o.value !== "CANCELLED"),
    },
    ...moneyParams("totalBudget", "Total budget", "Maximum spend across this group's lifetime."),
  ],
  output: [{ key: "ok", type: "boolean", label: "Update accepted" }],

  async execute(input, ctx) {
    const set = compact({
      name: input.name,
      status: input.status,
      totalBudget: input.totalBudgetAmount !== undefined
        ? {
          amount: String(input.totalBudgetAmount),
          currencyCode: input.totalBudgetCurrency || "USD",
        }
        : undefined,
    });
    if (Object.keys(set).length === 0) {
      throw new Error("Set at least one of: name, status, totalBudgetAmount");
    }

    const id = bareId(input.campaignGroupId);
    const client = new LinkedInAdsClient(ctx);
    await client.request(`/rest/adAccounts/${bareId(input.accountId)}/adCampaignGroups`, {
      method: "POST",
      restliMethod: "BATCH_PARTIAL_UPDATE",
      query: { ids: restliList([id]) },
      body: { entities: { [id]: { patch: { $set: set } } } },
    });
    return { ok: true };
  },
};

export default campaignGroupUpdate;
