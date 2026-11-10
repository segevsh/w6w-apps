import type { TriggerDefinition } from "@w6w/types";
import listActionPlans from "../actions/list-action-plans.ts";
import { newRecords, readAllPages } from "../lib/triggers.ts";

/**
 * Action Plans are a bounded set of account sequences and `GET /actionPlans` can sort only by a
 * named field, so every check reads the Active plans through `list-action-plans` and diffs the ids
 * (`pollSnapshot`, added only). Follow Up Boss flags this endpoint for future deprecation
 * (Automations 2.0); no date is set. https://docs.followupboss.com/reference/actionplans-get
 * (2026-11-10)
 */
const trigger: TriggerDefinition = {
  key: "new-action-plan",
  title: "New Action Plan",
  description: "The run gets each Action Plan newly created in your Follow Up Boss account.",
  output: [
    { key: "id", type: "number", label: "Action Plan ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: { id: 287564, name: "New lead nurture", status: "Active" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    return newRecords({
      state,
      items: await readAllPages(listActionPlans, { status: "Active" }, ctx),
    });
  },
};

export default trigger;
