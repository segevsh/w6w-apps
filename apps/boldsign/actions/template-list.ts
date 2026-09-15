import type { ActionDefinition } from "@w6w/types";
import { BoldSignClient } from "../lib/client.ts";

interface Input {
  page: number;
  pageSize?: number;
  searchKey?: string;
}

/** `GET /v1/template/list` — the account's templates. `Page` is documented `required`. */
const templateList: ActionDefinition<Input> = {
  key: "template-list",
  type: "search",
  resource: "template",
  title: "List Templates",
  description: "List the account's templates.",
  params: [
    { key: "page", label: "Page", type: "number", required: true, default: 1 },
    { key: "pageSize", label: "Page size", type: "number", default: 10 },
    { key: "searchKey", label: "Search", type: "string" },
  ],
  output: [
    { key: "pageDetails", type: "object", label: "Pagination details" },
    { key: "result", type: "array", label: "Templates" },
  ],

  execute(input, ctx) {
    return new BoldSignClient(ctx).request("/template/list", {
      query: { Page: input.page, PageSize: input.pageSize, SearchKey: input.searchKey },
    });
  },
};

export default templateList;
