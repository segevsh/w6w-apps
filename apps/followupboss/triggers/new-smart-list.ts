import type { TriggerDefinition } from "@w6w/types";
import listSmartLists from "../actions/list-smart-lists.ts";
import { newRecords, readAllPages } from "../lib/triggers.ts";

/**
 * Smart Lists are saved filters, a bounded set per account, and `GET /smartLists` has no sort. Every
 * check reads all of them (`all=true`: classic and current UI) through `list-smart-lists` and
 * diffs the ids (`pollSnapshot`, added only).
 * https://docs.followupboss.com/reference/smartlists-get (2026-11-10)
 */
const trigger: TriggerDefinition = {
  key: "new-smart-list",
  title: "New Smart List",
  description: "The run gets each Smart List newly created in your Follow Up Boss account.",
  output: [
    { key: "id", type: "number", label: "Smart List ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: 12, name: "Hot Buyers" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    return newRecords({ state, items: await readAllPages(listSmartLists, { all: true }, ctx) });
  },
};

export default trigger;
