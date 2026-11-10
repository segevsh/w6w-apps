import type { TriggerDefinition } from "@w6w/types";
import fundList from "../actions/fund-list.ts";
import { newRecords, readAllPages } from "../lib/triggers.ts";

/**
 * An account has a handful of funds and GET /funds has no sort or since filter.
 * Every check reads all pages through `fund-list` and diffs the ids (`pollSnapshot`, added
 * only). https://docs.givebutter.com/api-reference/funds/list-all-funds (2026-11-10)
 */
const trigger: TriggerDefinition = {
  key: "new-fund",
  title: "New Fund",
  description: "The run gets each fund newly created on your Givebutter account.",
  output: [
    { key: "id", type: "number", label: "Fund ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "raised", type: "number", label: "Raised" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: { id: 88, name: "General fund", raised: 1250, created_at: "2026-11-09T10:00:00Z" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    return newRecords({ state, items: await readAllPages(fundList, {}, ctx) });
  },
};

export default trigger;
