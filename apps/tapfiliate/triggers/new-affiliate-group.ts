import type { TriggerDefinition } from "@w6w/types";
import affiliateGroupList from "../actions/affiliate-group-list.ts";
import { newRecords, readAll } from "../lib/triggers.ts";

/**
 * Affiliate groups are a small bounded collection with no timestamps
 * (https://developers.tapfiliate.com/api-reference/affiliate-groups/list-all-affiliate-groups,
 * 2026-11-10): every check reads `affiliate-group-list` and diffs the ids (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition = {
  key: "new-affiliate-group",
  title: "New Affiliate Group",
  description: "The run gets each affiliate group that appears on the account.",
  output: [
    { key: "id", type: "string", label: "Group ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "affiliate_count", type: "number", label: "Affiliates in the group" },
  ],
  sample: { id: "ag_eXampl3", title: "Gold affiliates", affiliate_count: 0 },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const items = await readAll(affiliateGroupList, {}, ctx);
    return newRecords({ state, items, idOf: (g) => (g as { id?: unknown }).id });
  },
};

export default trigger;
