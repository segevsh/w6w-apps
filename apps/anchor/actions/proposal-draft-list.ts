import type { ActionDefinition } from "@w6w/types";
import { AnchorClient } from "../lib/client.ts";
import { limitParam, pageParam, searchParam } from "../lib/params.ts";

/** `GET /v2/proposal-drafts` — Anchor operation `listProposalDrafts`. */
interface Input {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  contactId?: string;
}

const proposalDraftList: ActionDefinition<Input> = {
  key: "proposal-draft-list",
  type: "search",
  resource: "proposal-draft",
  title: "List Proposal Drafts",
  description: "Page through proposal drafts (work in progress, not yet sent to a client).",
  params: [
    pageParam,
    limitParam,
    searchParam,
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "Comma-separated: active, scheduled, archived. Anchor defaults to active,scheduled.",
    },
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      hint: "Only drafts for this client contact.",
    },
  ],
  output: [
    { key: "entries", type: "array", label: "Items on this page" },
    { key: "page", type: "number", label: "Page" },
    { key: "limit", type: "number", label: "Page size" },
    { key: "totalCount", type: "number", label: "Total matching items" },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request("GET", "/v2/proposal-drafts", {
      query: {
        page: input.page,
        limit: input.limit,
        search: input.search,
        status: input.status,
        contactId: input.contactId,
      },
    });
  },
};

export default proposalDraftList;
