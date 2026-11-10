import type { TriggerDefinition } from "@w6w/types";
import campaignList from "../actions/campaign-list.ts";
import { newRecords, readAllPages } from "../lib/triggers.ts";

/**
 * An account has a small bounded set of campaigns and GET /campaigns has no sort or since filter (only `scope`).
 * Every check reads all pages through `campaign-list` and diffs the ids (`pollSnapshot`, added
 * only). https://docs.givebutter.com/api-reference/campaigns/list-all-campaigns (2026-11-10)
 */
const trigger: TriggerDefinition = {
  key: "new-campaign",
  title: "New Campaign",
  description: "The run gets each campaign newly created on your Givebutter account.",
  output: [
    { key: "id", type: "number", label: "Campaign ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "type", type: "string", label: "Type" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: 1201,
    title: "Annual Gala",
    type: "event",
    status: "active",
    created_at: "2026-11-09T10:00:00Z",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    return newRecords({ state, items: await readAllPages(campaignList, {}, ctx) });
  },
};

export default trigger;
