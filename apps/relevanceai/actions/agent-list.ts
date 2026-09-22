import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, RelevanceAiClient } from "../lib/client.ts";
import { filtersParam, paginationParams, queryParam, sortParam } from "../lib/params.ts";

/**
 * `POST /agents/list` — the agents this project can see.
 *
 * A POST that reads: the vendor's own schema declares no `GET /agents` at all,
 * and `POST /agents/list` is the only listing route in the 527-path document
 * (there is no sibling `GET /agents/list`). Its `ListAgentsInput` takes `query`,
 * `filters`, `page`, `page_size` and `sort` — all optional — and answers
 * `ListAgentsOutput` = `{results: [...]}`.
 *
 * The two `filters`/`sort` params are JSON because they are the vendor's own
 * filter DSL: `filter_type` is an eleven-member enum (`exact_match`, `exists`,
 * `ilike`, `regexp`, `ids`, `date`, `numeric`, `or`, `and`, `size`,
 * `array_object_match`) and the `or`/`and` members nest further filters, which no
 * flat form can express. `include_public_agents` is deliberately not exposed:
 * the live schema describes it as "DEPRECATED: this parameter had no effect and
 * is now ignored".
 */
interface Input {
  query?: string;
  filters?: unknown;
  page?: number;
  pageSize?: number;
  sort?: unknown;
}

const agentList: ActionDefinition<Input> = {
  key: "agent-list",
  type: "read",
  resource: "agent",
  title: "List Agents",
  description: "List the agents in this project, with an optional name search, filters and sort.",
  params: [queryParam, ...paginationParams(), filtersParam, sortParam],
  output: [{ key: "results", type: "array", label: "Agents" }],

  execute(input, ctx) {
    return new RelevanceAiClient(ctx).json("/agents/list", {
      method: "POST",
      body: {
        query: input.query,
        filters: asOptionalJson(input.filters, "filters"),
        page: input.page,
        page_size: input.pageSize,
        sort: asOptionalJson(input.sort, "sort"),
      },
    });
  },
};

export default agentList;
