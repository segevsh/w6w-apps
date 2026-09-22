import type { ActionDefinition } from "@w6w/types";
import { NocrmClient, SIMPLE } from "../lib/client.ts";
import { leadOutput } from "../lib/params.ts";

interface Input {
  leadId: string;
  tag: string;
}

/**
 * `GET /api/simple/leads/{lead_id}/add_tag?tag=…` — add a tag to a lead.
 *
 * This is one of the Simplified API's endpoints, and it is a **GET that
 * mutates**. That is the vendor's design, not a mistake here: the Simplified
 * API's own introduction says "This API accepts only GET requests to simplify
 * the use and we use the https protocol to secure the transactions", and its
 * example request is literally
 * `curl -H "X-API-KEY: …" "https://…/api/simple/leads/145676/add_tag?tag=ProductA"`.
 *
 * It is typed `perform` and named for its effect rather than its verb, because
 * a workflow author cares that it changes a lead, not that the wire used GET.
 *
 * ## The credential
 *
 * The Simplified API section states the header "is mandatory. Failing to pass
 * this header will result in a 401 error status". Its example sends `X-API-KEY`
 * and documents no USER-token form anywhere in that section, so this action
 * expects an **API-key** connection; a USER-token connection sends a header the
 * Simplified API does not accept.
 *
 * The response is the updated lead object, the same shape the `/v2` endpoints
 * return.
 *
 * Not idempotent as far as the document states: it describes adding a tag and
 * says nothing about what re-adding an existing one does, so a retry is not
 * declared safe.
 */
const leadAddTag: ActionDefinition<Input> = {
  key: "lead-add-tag",
  type: "perform",
  resource: "lead",
  title: "Add Tag to Lead",
  description: "Add one tag to a lead. Simplified API, so it needs an API-key connection " +
    "(GET /api/simple/leads/{id}/add_tag).",
  idempotent: false,
  params: [
    {
      key: "leadId",
      label: "Lead ID",
      type: "string",
      required: true,
      hint: "The lead's id, as returned by Create Lead or List Leads.",
    },
    {
      key: "tag",
      label: "Tag",
      type: "string",
      required: true,
      hint: "The tag to add. Required by the document's parameter table.",
    },
  ],
  output: leadOutput,

  execute(input, ctx) {
    return new NocrmClient(ctx).request(
      `${SIMPLE}/leads/${encodeURIComponent(input.leadId)}/add_tag`,
      { query: { tag: input.tag } },
    );
  },
};

export default leadAddTag;
