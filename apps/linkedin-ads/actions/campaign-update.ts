import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, bareId, compact, LinkedInAdsClient } from "../lib/client.ts";
import {
  accountIdParam,
  campaignIdParam,
  campaignStatusOptions,
  moneyParams,
} from "../lib/params.ts";

interface Input {
  accountId: string;
  campaignId: string;
  name?: string;
  status?: string;
  dailyBudgetAmount?: number;
  dailyBudgetCurrency?: string;
  totalBudgetAmount?: number;
  totalBudgetCurrency?: string;
  targetingCriteria?: string;
}

/**
 * `POST /rest/adAccounts/{accountId}/adCampaigns/{id}`, header
 * `X-RestLi-Method: PARTIAL_UPDATE`, body `{ patch: { $set: {...} } }` — a
 * plain single update (unlike Campaign Groups, this one IS documented
 * non-batch). Setting Status to "Pending deletion" is also how a non-DRAFT
 * campaign is deleted; see `campaign-delete.ts` for the DRAFT-only DELETE
 * verb.
 *
 * When updating `targetingCriteria`, the vendor requires the
 * `urn:li:adTargetingFacet:interfaceLocales` facet to be present in the new
 * criteria (not enforced client-side here — a missing one comes back as a
 * 4xx from LinkedIn with that detail in the message).
 */
const campaignUpdate: ActionDefinition<Input> = {
  key: "campaign-update",
  type: "perform",
  resource: "campaign",
  title: "Update Campaign",
  description: "Partially update a Campaign's name, status, budget or targeting. Only the " +
    "fields you set are changed.",
  idempotent: true,
  params: [
    accountIdParam,
    campaignIdParam,
    { key: "name", label: "New name", type: "string" },
    { key: "status", label: "New status", type: "select", options: campaignStatusOptions },
    ...moneyParams("dailyBudget", "New daily budget", "Leave empty to leave unchanged."),
    ...moneyParams("totalBudget", "New total budget", "Leave empty to leave unchanged."),
    {
      key: "targetingCriteria",
      label: "New targeting criteria (JSON)",
      type: "json",
      advanced: true,
      hint:
        "Replaces targeting entirely. Must include the urn:li:adTargetingFacet:interfaceLocales " +
        "facet — LinkedIn requires it on every targeting update.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Update accepted" }],

  async execute(input, ctx) {
    const set = compact({
      name: input.name,
      status: input.status,
      dailyBudget: input.dailyBudgetAmount !== undefined
        ? {
          amount: String(input.dailyBudgetAmount),
          currencyCode: input.dailyBudgetCurrency || "USD",
        }
        : undefined,
      totalBudget: input.totalBudgetAmount !== undefined
        ? {
          amount: String(input.totalBudgetAmount),
          currencyCode: input.totalBudgetCurrency || "USD",
        }
        : undefined,
      targetingCriteria: asOptionalJson(input.targetingCriteria, "targetingCriteria"),
    });
    if (Object.keys(set).length === 0) {
      throw new Error("Set at least one field to update.");
    }

    const client = new LinkedInAdsClient(ctx);
    await client.request(
      `/rest/adAccounts/${bareId(input.accountId)}/adCampaigns/${bareId(input.campaignId)}`,
      { method: "POST", restliMethod: "PARTIAL_UPDATE", body: { patch: { $set: set } } },
    );
    return { ok: true };
  },
};

export default campaignUpdate;
