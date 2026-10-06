import type { ActionDefinition } from "@w6w/types";
import { AnchorClient } from "../lib/client.ts";
import { limitParam, pageParam, searchParam } from "../lib/params.ts";

/** `GET /service-templates` — Anchor operation `listServiceTemplates`. */
interface Input {
  page?: number;
  limit?: number;
  search?: string;
  searchMode?: string;
  type?: string;
}

const serviceTemplateList: ActionDefinition<Input> = {
  key: "service-template-list",
  type: "search",
  resource: "service-template",
  title: "List Service Templates",
  description: "Page through reusable service templates and bundles (name, billing, pricing).",
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
    { key: "type", label: "Type", type: "string", hint: "Comma-separated: service, bundle." },
  ],
  output: [
    { key: "entries", type: "array", label: "Items on this page" },
    { key: "page", type: "number", label: "Page" },
    { key: "limit", type: "number", label: "Page size" },
    { key: "totalCount", type: "number", label: "Total matching items" },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request("GET", "/service-templates", {
      query: {
        page: input.page,
        limit: input.limit,
        search: input.search,
        searchMode: input.searchMode,
        type: input.type,
      },
    });
  },
};

export default serviceTemplateList;
