import type { TriggerDefinition } from "@w6w/types";
import sequenceSearch from "../actions/sequence-search.ts";
import { newRecords, readAllPages } from "../lib/triggers.ts";

/**
 * A team's sequences are a small bounded collection that `POST /emailer_campaigns/search` pages
 * with `page` / `per_page` and `pagination.total_pages`
 * (https://docs.apollo.io/reference/search-for-sequences, 2026-11-10). Every check reads all pages
 * through `sequence-search` and diffs the ids (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition = {
  key: "new-sequence",
  title: "New Sequence",
  description: "The run gets each sequence newly created in your team's Apollo account.",
  output: [
    { key: "id", type: "string", label: "Sequence ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "active", type: "boolean", label: "Active" },
  ],
  sample: {
    id: "66e9e215ece19801b219997f",
    name: "Q2 Outreach",
    created_at: "2024-09-17T20:09:57.837Z",
    active: false,
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const items = await readAllPages(sequenceSearch, "sequences", ctx);
    return newRecords({ state, items, idOf: (s) => (s as { id?: unknown }).id });
  },
};

export default trigger;
