import type { TriggerDefinition } from "@w6w/types";
import programList from "../actions/program-list.ts";
import { newRecords, readAll } from "../lib/triggers.ts";

/**
 * Programs are a small bounded collection with no timestamps
 * (https://developers.tapfiliate.com/api-reference/programs/list-all-programs, 2026-11-10): every
 * check reads all pages through `program-list` and diffs the ids (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition = {
  key: "new-program",
  title: "New Program",
  description: "The run gets each program that appears on the account.",
  output: [
    { key: "id", type: "string", label: "Program ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "currency", type: "string", label: "Currency" },
  ],
  sample: { id: "johns-affiliate-program", title: "John's affiliate program", currency: "USD" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const items = await readAll(programList, {}, ctx);
    return newRecords({ state, items, idOf: (p) => (p as { id?: unknown }).id });
  },
};

export default trigger;
