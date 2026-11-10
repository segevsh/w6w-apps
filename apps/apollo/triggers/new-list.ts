import type { TriggerDefinition } from "@w6w/types";
import listList from "../actions/list-list.ts";
import { newRecords } from "../lib/triggers.ts";

/**
 * `GET /labels` returns every list ("label") of the team in one unpaginated array — a small
 * bounded collection (https://docs.apollo.io/reference/get-a-list-of-all-lists, 2026-11-10).
 * Every check reads it through `list-list` and diffs the ids (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition = {
  key: "new-list",
  title: "New List",
  description: "The run gets each list (label) newly created in your team's Apollo account.",
  output: [
    { key: "id", type: "string", label: "List ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "modality", type: "string", label: "Kind (contacts, accounts, emailer_campaigns)" },
    { key: "cached_count", type: "number", label: "Records in the list" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "6660862c078cf0038abedb64",
    name: "Conference 2024 - Maui",
    modality: "contacts",
    cached_count: 25,
    created_at: "2024-06-05T15:37:16.684Z",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const res = await listList.execute({}, ctx) as { lists?: unknown[] };
    return newRecords({
      state,
      items: res.lists ?? [],
      idOf: (l) => (l as { id?: unknown }).id,
    });
  },
};

export default trigger;
