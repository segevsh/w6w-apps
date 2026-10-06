import type { ActionDefinition } from "@w6w/types";
import { AnchorClient } from "../lib/client.ts";
import { limitParam, pageParam, searchParam } from "../lib/params.ts";

/** `GET /proposals` — Anchor operation `listProposals`. */
interface Input {
  page?: number;
  limit?: number;
  search?: string;
  searchMode?: string;
  status?: string;
  withdrawnForEditing?: boolean;
  contactId?: string;
}

const proposalList: ActionDefinition<Input> = {
  key: "proposal-list",
  type: "search",
  resource: "proposal",
  title: "List Proposals",
  description:
    "Page through proposals sent to clients (name, status, client, expiration, progress).",
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
      type: "select",
      options: [{ value: "pending", label: "pending" }, { value: "expired", label: "expired" }],
      hint: "pending or expired.",
    },
    {
      key: "withdrawnForEditing",
      label: "Withdrawn for editing",
      type: "boolean",
      hint: "Only proposals currently withdrawn for editing.",
    },
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      hint: "Only proposals for this client contact.",
    },
  ],
  output: [
    { key: "entries", type: "array", label: "Items on this page" },
    { key: "page", type: "number", label: "Page" },
    { key: "limit", type: "number", label: "Page size" },
    { key: "totalCount", type: "number", label: "Total matching items" },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request("GET", "/proposals", {
      query: {
        page: input.page,
        limit: input.limit,
        search: input.search,
        searchMode: input.searchMode,
        status: input.status,
        withdrawnForEditing: input.withdrawnForEditing,
        contactId: input.contactId,
      },
    });
  },
};

export default proposalList;
