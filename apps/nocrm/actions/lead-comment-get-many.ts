import type { ActionDefinition } from "@w6w/types";
import { NocrmClient, type NocrmPage, V2 } from "../lib/client.ts";
import { directionParam, listOutput } from "../lib/params.ts";

interface Input {
  leadId: string;
  direction?: string;
}

/**
 * `GET /api/v2/leads/{lead_id}/comments` — a lead's comments.
 *
 * Verified against the Retrieve-all-comments-from-a-lead table in noCRM's API
 * document (<https://www.nocrm.io/api>, read 2026-09-22): the lead's id is
 * required, and `direction` is optional with the documented default `desc`
 * ("Direction for ordereing the data returned in ascending or descending" — the
 * vendor's own typo). The table documents no `limit`, so this is one page.
 */
const leadCommentGetMany: ActionDefinition<Input, NocrmPage> = {
  key: "lead-comment-get-many",
  type: "search",
  resource: "comment",
  title: "List Lead Comments",
  description: "Retrieve all comments on a lead (GET /api/v2/leads/{lead_id}/comments).",
  params: [
    {
      key: "leadId",
      label: "Lead ID",
      type: "string",
      required: true,
      hint: "The lead's id, as returned by Create Lead or List Leads.",
    },
    directionParam("desc"),
  ],
  output: listOutput("Comments"),

  execute(input, ctx) {
    return new NocrmClient(ctx).list(
      `${V2}/leads/${encodeURIComponent(input.leadId)}/comments`,
      { query: { direction: input.direction } },
    );
  },
};

export default leadCommentGetMany;
