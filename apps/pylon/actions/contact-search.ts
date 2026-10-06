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

const FIELDS = "id, email, name, account_id, or a custom field slug";

/** `POST /contacts/search`. */
const contactSearch: ActionDefinition<Input> = {
  key: "contact-search",
  type: "search",
  resource: "contact",
  title: "Search Contacts",
  description: "Search contacts by a filter tree and/or fuzzy text, e.g. by email or account.",
  params: [filterParam(FIELDS), searchTextParam, cursorParam, limitParam()],
  output: [{ key: "contacts", type: "array", label: "Contacts on this page" }, ...PAGE_OUTPUT],

  async execute(input, ctx) {
    const { items, ...page } = await new PylonClient(ctx).list("POST", "/contacts/search", {
      body: compact({
        filter: jsonValue(input.filter),
        search_text: input.searchText,
        cursor: input.cursor,
        limit: input.limit,
      }),
    });
    return { contacts: items, ...page };
  },
};

export default contactSearch;
