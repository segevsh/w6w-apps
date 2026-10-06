import type { ActionDefinition } from "@w6w/types";
import { AnchorClient } from "../lib/client.ts";
import { limitParam, pageParam, searchParam } from "../lib/params.ts";

/** `GET /proposal-templates` — Anchor operation `listProposalTemplates`. */
interface Input {
  page?: number;
  limit?: number;
  search?: string;
  searchMode?: string;
}

const proposalTemplateList: ActionDefinition<Input> = {
  key: "proposal-template-list",
  type: "search",
  resource: "proposal-template",
  title: "List Proposal Templates",
  description:
    "Page through saved proposal templates. Returns id and last-updated time only; fetch one for the full structure.",
  params: [
    pageParam,
    limitParam,
    searchParam,
    {
      key: "searchMode",
      label: "Search mode",
      type: "select",
      options: [{ value: "substring", label: "substring" }, { value: "fuzzy", label: "fuzzy" }, {
        value: "exact",
        label: "exact",
      }],
      hint: "How `search` matches.",
    },
  ],
  output: [
    { key: "entries", type: "array", label: "Items on this page" },
    { key: "page", type: "number", label: "Page" },
    { key: "limit", type: "number", label: "Page size" },
    { key: "totalCount", type: "number", label: "Total matching items" },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request("GET", "/proposal-templates", {
      query: {
        page: input.page,
        limit: input.limit,
        search: input.search,
        searchMode: input.searchMode,
      },
    });
  },
};

export default proposalTemplateList;
