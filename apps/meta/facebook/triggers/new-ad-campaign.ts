import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import listAdCampaigns from "../actions/list-ad-campaigns.ts";
import { newRecords, readAllPages } from "../lib/snapshot.ts";

/**
 * The campaigns of one ad account the user picks (`GET /{ad-account-id}/campaigns`,
 * https://developers.facebook.com/docs/marketing-api/reference/ad-account/campaigns/, 2026-11-10)
 * are read in full through `list-ad-campaigns` and the ids diffed (`pollSnapshot`, added only).
 * The edge documents no created-after filter and no sort, so a snapshot is the honest shape; the
 * snapshot kit refuses more than 5000 campaigns with an error naming the cap.
 */
const trigger: TriggerDefinition<{ adAccountId?: string }> = {
  key: "new-ad-campaign",
  title: "New Ad Campaign",
  description: "The run gets each campaign that appears in one Facebook ad account.",
  params: [{
    key: "adAccountId",
    label: "Ad Account ID",
    type: "string",
    required: true,
    hint: "Must be prefixed, e.g. act_1234567890.",
  }],
  output: [
    { key: "id", type: "string", label: "Campaign ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "objective", type: "string", label: "Objective" },
    { key: "effective_status", type: "string", label: "Effective status" },
    { key: "created_time", type: "string", label: "Created time" },
  ],
  sample: {
    id: "120210000000000001",
    name: "Spring promo",
    status: "PAUSED",
    objective: "OUTCOME_TRAFFIC",
    effective_status: "PAUSED",
    created_time: "2026-11-09T09:30:00+0000",
  },
  minIntervalMs: 300_000,
  async poll({ state, params }, ctx) {
    const adAccountId = typeof params.adAccountId === "string" ? params.adAccountId.trim() : "";
    if (!adAccountId) throw new Error("Ad Account ID is required.");
    return newRecords({
      state,
      items: await readAllPages(listAdCampaigns as unknown as ActionDefinition, ctx, {
        adAccountId,
      }),
    });
  },
};

export default trigger;
