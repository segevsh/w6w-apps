import type { ActionDefinition } from "@w6w/types";
import { TwoChatClient } from "../lib/client.ts";

interface Input {
  query: string;
  channelUuid?: string;
  resultsPerPage?: number;
  pageNumber?: number;
}

const contactsSearch: ActionDefinition<Input> = {
  key: "contacts-search",
  type: "search",
  resource: "contact",
  title: "Search Contacts",
  description: "Search contacts by phone number or name (GET /contacts/search), paginated.",
  params: [
    {
      key: "query",
      label: "Search term",
      type: "string",
      required: true,
      hint: "A phone number or a name, e.g. 2123334444 or Kate Smith.",
    },
    {
      key: "channelUuid",
      label: "WhatsApp channel UUID",
      type: "string",
    },
    {
      key: "resultsPerPage",
      label: "Results per page",
      type: "number",
      default: 30,
      hint: "1 to 100.",
    },
    {
      key: "pageNumber",
      label: "Page number",
      type: "number",
      hint: "Zero-based page index. 2Chat's first page is 0.",
    },
  ],
  output: [
    { key: "contacts", type: "array", label: "Matching contacts" },
    { key: "page", type: "number", label: "Page returned" },
    { key: "count", type: "number", label: "Contacts on this page" },
  ],

  execute(input, ctx) {
    const client = new TwoChatClient(ctx);
    // The developer docs name the term `query`; the vendor's agent skill names it `q`. Both are
    // sent — an unknown query key is ignored, and which one is live is not documented anywhere.
    return client.get("/contacts/search", {
      query: input.query,
      q: input.query,
      channel_uuid: input.channelUuid,
      results_per_page: input.resultsPerPage,
      page_number: input.pageNumber ?? 0,
    });
  },
};

export default contactsSearch;
