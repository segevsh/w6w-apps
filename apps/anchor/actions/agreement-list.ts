import type { ActionDefinition } from "@w6w/types";
import { AnchorClient } from "../lib/client.ts";
import { limitParam, pageParam, searchParam } from "../lib/params.ts";

/** `GET /v2/agreements` — Anchor operation `listAgreementsV2`. */
interface Input {
  page?: number;
  limit?: number;
  search?: string;
  searchMode?: string;
  status?: string;
  contactId?: string;
}

const agreementList: ActionDefinition<Input> = {
  key: "agreement-list",
  type: "search",
  resource: "agreement",
  title: "List Agreements",
  description: "Page through signed agreements (v2 list; identical payload to v1).",
  params: [
    pageParam,
    limitParam,
    searchParam,
    {
      key: "searchMode",
      label: "Search mode",
      type: "select",
      options: [{ value: "substring", label: "substring" }, { value: "fuzzy", label: "fuzzy" }],
      hint: "How `search` matches.",
    },
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "Comma-separated: active, terminated, completed.",
    },
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      hint: "Only agreements for this client contact.",
    },
  ],
  output: [
    { key: "entries", type: "array", label: "Items on this page" },
    { key: "page", type: "number", label: "Page" },
    { key: "limit", type: "number", label: "Page size" },
    { key: "totalCount", type: "number", label: "Total matching items" },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request("GET", "/v2/agreements", {
      query: {
        page: input.page,
        limit: input.limit,
        search: input.search,
        searchMode: input.searchMode,
        status: input.status,
        contactId: input.contactId,
      },
    });
  },
};

export default agreementList;
