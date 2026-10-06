import type { ActionDefinition } from "@w6w/types";
import { compact, jsonValue, PylonClient } from "../lib/client.ts";
import {
  cursorParam,
  filterParam,
  limitParam,
  PAGE_OUTPUT,
  searchTextParam,
} from "../lib/params.ts";

interface Input {
  filter?: unknown;
  searchText?: string;
  cursor?: string;
  limit?: number;
}

const FIELDS = "id, domains, tags, name, external_ids, owner_id, or a custom field slug";

/** `POST /accounts/search`. */
const accountSearch: ActionDefinition<Input> = {
  key: "account-search",
  type: "search",
  resource: "account",
  title: "Search Accounts",
  description:
    "Search accounts by a filter tree and/or fuzzy text, e.g. by domain, name or external ID.",
  params: [filterParam(FIELDS), searchTextParam, cursorParam, limitParam()],
  output: [{ key: "accounts", type: "array", label: "Accounts on this page" }, ...PAGE_OUTPUT],

  async execute(input, ctx) {
    const { items, ...page } = await new PylonClient(ctx).list("POST", "/accounts/search", {
      body: compact({
        filter: jsonValue(input.filter),
        search_text: input.searchText,
        cursor: input.cursor,
        limit: input.limit,
      }),
    });
    return { accounts: items, ...page };
  },
};

export default accountSearch;
