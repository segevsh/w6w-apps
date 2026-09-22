import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, RelevanceAiClient } from "../lib/client.ts";
import { filtersParam, paginationParams, queryParam, sortParam } from "../lib/params.ts";

/**
 * `GET /studios/list` — the tools this project can see.
 *
 * A plain GET, unlike its agent counterpart (`POST /agents/list`), which is worth
 * knowing when reading a log: the two list actions do not share a method even
 * though they share their `query`/`page`/`page_size`/`sort`/`filters` vocabulary.
 *
 * `ListStudiosOutput` is `{results, openapi_schema?}`. Only `results` is
 * requested and only `results` is declared — `openapi_schema` is the full
 * parameter schema of every listed tool, which is what `Get Tool` returns for one
 * tool when it is actually needed, and it is not asked for here
 * (`return_openapi_schema` defaults to `false`).
 */
interface Input {
  query?: string;
  filters?: unknown;
  page?: number;
  pageSize?: number;
  sort?: unknown;
}

const toolList: ActionDefinition<Input> = {
  key: "tool-list",
  type: "read",
  resource: "tool",
  title: "List Tools",
  description: "List the tools in this project, with an optional search, filters and sort.",
  params: [queryParam, ...paginationParams(), filtersParam, sortParam],
  output: [{ key: "results", type: "array", label: "Tools" }],

  execute(input, ctx) {
    return new RelevanceAiClient(ctx).json("/studios/list", {
      query: {
        query: input.query,
        filters: asOptionalJson(input.filters, "filters"),
        page: input.page,
        page_size: input.pageSize,
        sort: asOptionalJson(input.sort, "sort"),
      },
    });
  },
};

export default toolList;
