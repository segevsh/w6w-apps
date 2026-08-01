import type { ActionDefinition } from "@w6w/types";
import { type Bitlink, BitlyClient } from "../lib/client.ts";

interface Input {
  groupGuid: string;
  query?: string;
  archived?: boolean;
  size?: number;
  searchAfter?: string;
}

interface ListBitlinksResult {
  items: Bitlink[];
  nextSearchAfter?: string;
}

interface RawResponse {
  links: Bitlink[];
  pagination?: { search_after?: string };
}

/**
 * GET /groups/{group_guid}/bitlinks
 *
 * Bitly scopes Bitlink listing to a group, not the whole account — every
 * connected account has at least one (its default) group. Cursor-paginated
 * via `search_after`: pass the previous call's `nextSearchAfter` back in to
 * keep walking.
 */
const listBitlinks: ActionDefinition<Input, ListBitlinksResult> = {
  key: "list-bitlinks",
  type: "search",
  resource: "bitlink",
  title: "List Bitlinks",
  description: "List the Bitlinks in a group. Returns one page — pass `searchAfter` to walk.",
  params: [
    {
      key: "groupGuid",
      label: "Group GUID",
      type: "string",
      required: true,
      hint: "See List Groups for the account's group GUIDs.",
    },
    { key: "query", label: "Search query", type: "string" },
    { key: "archived", label: "Archived only", type: "boolean" },
    { key: "size", label: "Page size", type: "number", default: 50 },
    { key: "searchAfter", label: "Search-after token", type: "string" },
  ],
  output: [
    { key: "items", type: "array", label: "Bitlinks" },
    { key: "nextSearchAfter", type: "string", label: "Next search-after token" },
  ],

  async execute(input, ctx) {
    const client = new BitlyClient(ctx);
    const res = await client.request<RawResponse>(`/groups/${input.groupGuid}/bitlinks`, {
      query: {
        query: input.query,
        archived: input.archived,
        size: input.size ?? 50,
        search_after: input.searchAfter,
      },
    });
    return { items: res.links, nextSearchAfter: res.pagination?.search_after };
  },
};

export default listBitlinks;
