import type { TriggerDefinition } from "@w6w/types";
import campaignList from "../actions/campaign-list.ts";
import { accountIdParam } from "../lib/params.ts";
import { newRecords, readAllPages } from "../lib/triggers.ts";

/**
 * An account has a small bounded set of advertising campaigns and GET /v1/campaigns has no sort or since filter.
 * Every check reads all pages through `campaign-list` and diffs the ids (`pollSnapshot`, added only).
 * https://api.leadfeeder.com/openapi.yaml, `getCampaigns` (2026-11-10)
 */
const trigger: TriggerDefinition = {
  key: "new-campaign",
  title: "New Campaign",
  description:
    "The run gets each advertising campaign newly created in the chosen Leadfeeder account.",
  params: [
    accountIdParam,
  ],
  output: [
    { key: "id", type: "string", label: "Campaign ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "attributes", type: "object", label: "Campaign attributes" },
  ],
  sample: { id: "4201", type: "campaign", attributes: { name: "Autumn ABM" } },
  minIntervalMs: 300_000,
  async poll({ state, params }, ctx) {
    const p = params as { accountId: string };
    return newRecords({
      state,
      items: await readAllPages(campaignList, { accountId: p.accountId }, ctx),
    });
  },
};

export default trigger;
