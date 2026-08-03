import type { ActionDefinition } from "@w6w/types";
import { AttioClient, compact, PAGE_OUTPUT, SEARCH_MAX_LIMIT } from "../lib/client.ts";

interface Input {
  query: string;
  objects: string[];
  limit?: number;
  workspaceMemberId?: string;
  workspaceMemberEmail?: string;
}

/**
 * `POST /v2/objects/records/search` — fuzzy search across objects.
 *
 * Note the path: `/v2/objects/records/search`, with no `{object}` segment. The
 * objects to search are a required **body** field, and at least one must be
 * named (`minItems: 1`) — there is no "search everything" mode.
 *
 * ## What it matches, and what it does not
 *
 * "The matching strategy employed in this endpoint follows the in-product
 * strategy and will match names, domains, emails, phone numbers and social
 * handles on people and companies, and labels on all other objects." So on a
 * custom object it searches the label attribute only; it is not a full-text
 * search over every field.
 *
 * ## Two warnings the vendor prints, both carried onto the form
 *
 *  1. **Eventually consistent.** "Please note, results returned from this
 *     endpoint are eventually consistent. For results which are guaranteed to be
 *     up to date, please use the record query endpoint instead." A record
 *     created moments ago may not appear. That makes this the wrong tool for a
 *     dedupe-before-insert step, and List Records the right one.
 *  2. **Beta.** "This endpoint is in beta. We will aim to avoid breaking
 *     changes, but small updates may be made as we roll out to more users."
 *
 * ## `request_as` is required, and it is a permissions decision
 *
 * The third required field has no default. `{"type": "workspace"}` returns
 * everything the token can see; `{"type": "workspace-member", …}` restricts the
 * result to what one named person could see in the UI. Modelling that as two
 * optional identity params with a documented fallback keeps the common case one
 * field, while making the narrowing possible — it is the difference between "all
 * our deals" and "Alice's deals" and it cannot be expressed any other way.
 *
 * `limit` is capped at **25** and defaults to 25, which is also the maximum, so
 * this is a lookup tool rather than an export tool. There is no `offset`.
 */
const searchRecords: ActionDefinition<Input> = {
  key: "search-records",
  type: "search",
  resource: "record",
  title: "Search Records",
  description:
    "Fuzzy-search records across one or more objects, the same way Attio's own search box does " +
    "— names, domains, emails, phone numbers and social handles. Beta, capped at 25 results, and " +
    "eventually consistent: use List Records when the answer has to be current.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      placeholder: "alan mathis",
      hint: "Up to 256 characters. An empty string returns a default set of results.",
    },
    {
      key: "objects",
      label: "Objects",
      type: "array",
      item: { type: "string", placeholder: "people" },
      required: true,
      hint:
        "Object slugs or UUIDs to search. **At least one is required** — there is no search-all " +
        "mode. On people and companies this matches names, domains, emails, phones and social " +
        "handles; on every other object it matches the label attribute only.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: `Maximum results. Attio defaults to ${SEARCH_MAX_LIMIT}, which is also the maximum. ` +
        "There is no offset — this endpoint does not page.",
      validation: { min: 1, max: SEARCH_MAX_LIMIT, integer: true },
    },
    {
      key: "workspaceMemberId",
      label: "Search as workspace member (id)",
      type: "string",
      advanced: true,
      row: "as",
      hint:
        "Restrict results to what this member can see. Leave both member fields blank to search " +
        "as the whole workspace, which is the default.",
    },
    {
      key: "workspaceMemberEmail",
      label: "Search as workspace member (email)",
      type: "string",
      advanced: true,
      row: "as",
      hint: "Alternative to the id. If both are given, the id wins.",
    },
  ],
  output: PAGE_OUTPUT,

  async execute(input, ctx) {
    // `request_as` is required by the schema with no default, so one is chosen
    // here explicitly: workspace-wide unless a member was named.
    const requestAs = input.workspaceMemberId
      ? { type: "workspace-member", workspace_member_id: input.workspaceMemberId }
      : input.workspaceMemberEmail
      ? { type: "workspace-member", email_address: input.workspaceMemberEmail }
      : { type: "workspace" };

    const { records } = await new AttioClient(ctx).list("/objects/records/search", {
      method: "POST",
      body: compact({
        query: input.query,
        objects: input.objects,
        limit: input.limit,
        request_as: requestAs,
      }),
    });
    return { records };
  },
};

export default searchRecords;
