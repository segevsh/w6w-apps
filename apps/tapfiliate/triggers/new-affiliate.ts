import type { TriggerDefinition } from "@w6w/types";
import affiliateList from "../actions/affiliate-list.ts";
import { newRecords, readAll } from "../lib/triggers.ts";

/**
 * Affiliates are listed by creation time without a documented direction and without a date filter
 * (`GET /affiliates/`, https://developers.tapfiliate.com/api-reference/affiliates/list-all-affiliates
 * and the Pagination page, 2026-11-10), so every check reads the whole list and diffs the affiliate
 * ids (`pollSnapshot`, added only). A page walk that misses a row only delays it to the next check; a
 * repeated row is deduped by id. Lists longer than the kit's cap fail loudly.
 */
const trigger: TriggerDefinition = {
  key: "new-affiliate",
  title: "New Affiliate",
  description: "The run gets each affiliate that newly appears on the account.",
  params: [],
  output: [
    { key: "id", type: "string", label: "Affiliate ID" },
    { key: "firstname", type: "string", label: "First name" },
    { key: "lastname", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "u_JaN3-J0n",
    firstname: "Jane",
    lastname: "Jameson",
    email: "jane@example.com",
    created_at: "2026-11-09T12:00:00+00:00",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const items = await readAll(affiliateList, {}, ctx);
    return newRecords({ state, items, idOf: (a) => (a as { id?: unknown }).id });
  },
};

export default trigger;
