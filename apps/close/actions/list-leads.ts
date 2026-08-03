import type { ActionDefinition } from "@w6w/types";
import {
  CloseClient,
  type CloseList,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

type Input = PageInput;

/**
 * `GET /lead/` — offset-paginated list of Leads.
 *
 * Close's current documentation for this endpoint declares exactly three query
 * parameters: `_limit`, `_skip` and `_fields`. It does NOT declare a `query`
 * parameter, and the Leads resource page instead points elsewhere for filtering:
 * "To easily find Leads that match specific conditions, use the Advanced
 * Filtering API." So this action exposes only what is documented, and the
 * `search` action covers filtering. Adding an undocumented `query` here would be
 * inventing surface.
 */
const listLeads: ActionDefinition<Input> = {
  key: "list-leads",
  type: "search",
  resource: "lead",
  title: "List Leads",
  description:
    "List Leads one offset page at a time. To filter by conditions rather than walk the whole " +
    "collection, use the Search action — Close's Advanced Filtering API.",
  params: [...PAGE_PARAMS],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return new CloseClient(ctx).request<CloseList>("/lead/", {
      query: pageQuery(input),
    });
  },
};

export default listLeads;
