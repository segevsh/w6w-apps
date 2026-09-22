import type { ActionDefinition } from "@w6w/types";
import { NocrmClient, type NocrmPage, V2 } from "../lib/client.ts";
import { listOutput } from "../lib/params.ts";

interface Input {
  limit?: number;
}

/**
 * `GET /api/v2/leads/unassigned` — list the leads nobody owns.
 *
 * The List-the-unassigned-leads section of noCRM's API document
 * (<https://www.nocrm.io/api>, read 2026-09-22) documents exactly one parameter
 * — `limit`, default 100, "Maximum count of data returned by the request" — and
 * no `offset`, so this is a single page rather than the paged list
 * `lead-get-many` exposes. That is also why it has its own action: the
 * unassigned set is what a routing workflow starts from, and the document says
 * a lead created with the API key and no `user_id` lands here.
 */
const leadGetUnassigned: ActionDefinition<Input, NocrmPage> = {
  key: "lead-get-unassigned",
  type: "search",
  resource: "lead",
  title: "List Unassigned Leads",
  description:
    "List leads that belong to no user — the set a lead created with an API key and no " +
    "assignee lands in (GET /api/v2/leads/unassigned).",
  params: [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      validation: { integer: true },
      hint: "Maximum number of leads returned. The document's default is 100 and it documents " +
        "no offset parameter on this endpoint.",
    },
  ],
  output: listOutput("Unassigned leads"),

  execute(input, ctx) {
    return new NocrmClient(ctx).list(`${V2}/leads/unassigned`, {
      query: { limit: input.limit },
    });
  },
};

// The lead object inside `items` is the same one `lead-create`'s output
// documents as `lib/params.ts`'s `leadOutput`; `listOutput` names the array.
export default leadGetUnassigned;
