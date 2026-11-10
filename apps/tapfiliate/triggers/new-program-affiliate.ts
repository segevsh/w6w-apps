import type { TriggerDefinition } from "@w6w/types";
import programAffiliatesList from "../actions/program-affiliates-list.ts";
import { newRecords, readAll } from "../lib/triggers.ts";

/**
 * The affiliates of one program (`GET /programs/{program_id}/affiliates/`,
 * https://developers.tapfiliate.com/api-reference/programs/list-all-affiliates-in-program, 2026-11-10)
 * carry no sort or date filter, so every check reads the whole list for the chosen program and diffs
 * the affiliate ids (`pollSnapshot`, added only). A page walk that misses a row only delays it to the
 * next check; a repeated row is deduped by id. Lists longer than the kit's cap fail loudly.
 */
const trigger: TriggerDefinition = {
  key: "new-program-affiliate",
  title: "New Program Affiliate",
  description: "The run gets each affiliate newly added to or joining the chosen program.",
  params: [{
    key: "programId",
    label: "Program",
    type: "string",
    required: true,
    hint: "The program's id (e.g. john-s-affiliate-program).",
  }],
  output: [
    { key: "id", type: "string", label: "Affiliate ID" },
    { key: "firstname", type: "string", label: "First name" },
    { key: "lastname", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "approved", type: "boolean", label: "Approved in the program" },
    { key: "coupons", type: "array", label: "Coupons" },
  ],
  sample: {
    id: "u_JaN3-J0n",
    firstname: "Jane",
    lastname: "Jameson",
    email: "jane@example.com",
    created_at: "2026-11-09T12:00:00+00:00",
    approved: true,
    coupons: [],
  },
  minIntervalMs: 300_000,
  async poll({ state, params }, ctx) {
    const items = await readAll(programAffiliatesList, {
      programId: (params as { programId?: string }).programId,
    }, ctx);
    return newRecords({ state, items, idOf: (a) => (a as { id?: unknown }).id });
  },
};

export default trigger;
