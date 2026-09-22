import type { ActionDefinition } from "@w6w/types";
import { compact, HeyReachClient } from "../lib/client.ts";
import { linkedInIdParam, listIdParam, paginationParams } from "../lib/params.ts";

interface Input {
  listId: number;
  keyword?: string;
  leadProfileUrl?: string;
  leadLinkedInId?: string;
  createdFrom?: string;
  createdTo?: string;
  limit?: number;
  offset?: number;
}

/**
 * `POST /api/public/list/GetLeadsFromList` — the leads in one list.
 *
 * The document's `requestBody` for this operation is a bare `{"type":"string"}`
 * — a generator artifact — but its own `description` enumerates the body
 * parameters field by field (`listId`, `offset`, `limit`, `keyword`,
 * `leadProfileUrl`, `leadLinkedInId`, `createdFrom`, `createdTo`) and the 200
 * schema is fully specified, so the fields below are the document's, not a
 * guess. Everything travels in the POST body, filters included.
 *
 * `createdFrom`/`createdTo` bound the *lead's creation timestamp in the list*
 * (ISO 8601), which is the only way to ask "what was added since last night".
 */
const action: ActionDefinition<Input> = {
  key: "list-get-leads",
  type: "search",
  resource: "list",
  title: "Get Leads in List",
  description:
    "Read the leads in a lead list, filtered by keyword, profile URL or LinkedIn id and by " +
    "when they were added (POST /api/public/list/GetLeadsFromList).",
  params: [
    listIdParam,
    {
      key: "keyword",
      label: "Search",
      type: "string",
      hint: "Free-text match on the lead's name and other fields.",
    },
    {
      key: "leadProfileUrl",
      label: "LinkedIn profile URL",
      type: "string",
      hint: "Look up a single lead in this list by its profile URL.",
    },
    linkedInIdParam,
    {
      key: "createdFrom",
      label: "Added from",
      type: "datetime",
      hint: "ISO 8601. Only leads added to the list at or after this moment.",
    },
    {
      key: "createdTo",
      label: "Added before",
      type: "datetime",
      hint: "ISO 8601. Only leads added at or before this moment.",
    },
    ...paginationParams(100, "Leads per page. The API accepts up to 1000 per request."),
  ],
  output: [
    { key: "totalCount", type: "number", label: "Matching leads" },
    { key: "items", type: "array", label: "Leads" },
  ],

  execute(input, ctx) {
    return new HeyReachClient(ctx).request("/list/GetLeadsFromList", {
      method: "POST",
      body: compact({
        listId: input.listId,
        offset: input.offset,
        limit: input.limit,
        keyword: input.keyword,
        leadProfileUrl: input.leadProfileUrl,
        leadLinkedInId: input.leadLinkedInId,
        createdFrom: input.createdFrom,
        createdTo: input.createdTo,
      }),
    });
  },
};

export default action;
