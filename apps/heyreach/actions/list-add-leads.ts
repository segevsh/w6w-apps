import type { ActionDefinition } from "@w6w/types";
import { HeyReachClient } from "../lib/client.ts";
import { leadFields, listIdParam } from "../lib/params.ts";

interface Input {
  listId: number;
  leads: Array<Record<string, unknown>>;
}

/**
 * `POST /api/public/list/AddLeadsToListV2` — put up to 100 leads into a list.
 *
 * ## It upserts, and it says so per lead
 *
 * The response is `{ addedLeadsCount, updatedLeadsCount, failedLeadsCount }` —
 * a lead already in the list is *updated*, not duplicated, which is what makes
 * this safe to retry (`idempotent: true`). Read `failedLeadsCount`: the call
 * answers 200 even when individual leads were rejected.
 *
 * ## A list is not a campaign
 *
 * The document says it plainly: adding a lead to a list does **not** put it
 * into a campaign. A campaign that has finished, or has already consumed a
 * lead, will not pick the lead up from the list on its own — use Add Leads to
 * Campaign for that. This action is for building and maintaining the pool.
 */
const action: ActionDefinition<Input> = {
  key: "list-add-leads",
  type: "perform",
  resource: "list",
  title: "Add Leads to List",
  description: "Add up to 100 leads to a lead list, creating or updating each one " +
    "(POST /api/public/list/AddLeadsToListV2).",
  idempotent: true,
  params: [
    listIdParam,
    {
      key: "leads",
      label: "Leads",
      type: "array",
      required: true,
      item: { type: "object", fields: leadFields() },
      hint: "Up to 100 leads per request.",
    },
  ],
  output: [
    { key: "addedLeadsCount", type: "number", label: "Leads created" },
    { key: "updatedLeadsCount", type: "number", label: "Existing leads updated" },
    { key: "failedLeadsCount", type: "number", label: "Leads rejected" },
  ],

  execute(input, ctx) {
    return new HeyReachClient(ctx).request("/list/AddLeadsToListV2", {
      method: "POST",
      body: { listId: input.listId, leads: input.leads },
    });
  },
};

export default action;
