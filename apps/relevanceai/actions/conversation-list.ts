import type { ActionDefinition } from "@w6w/types";
import { RelevanceAiClient } from "../lib/client.ts";
import { paginationParams, queryParam } from "../lib/params.ts";

/**
 * `GET /agents/conversations/list` — the conversations runs have produced.
 *
 * The vendor's `ListConversationsOutput` is the richest shape in this app's
 * surface: `{results, agents, evals, costs}` — the conversation rows *plus* lookups
 * for the agents they belong to, their eval results and their cost breakdowns.
 * All four are passed through; which one a workflow wants depends on the job.
 *
 * ## Four parameters out of fourteen, deliberately
 *
 * The route takes `page`, `page_size`, `query`, `filters`, `sort`, plus eight
 * booleans and array toggles (`include_agent_details`, `include_eval_details`,
 * `include_debug_info`, `exclude_heavy_params`, `mask_pii`,
 * `event_logs_filters`, `exclude_fields`). The three the vendor's own reference
 * names as the common ones are exposed — the id boundaries a workflow actually
 * pages on. The flags change *what is inside* each row rather than which rows
 * come back, so a workflow that needs them is reading a debugging view, not
 * driving an integration; the rest is left out rather than half-supported.
 */
interface Input {
  page?: number;
  pageSize?: number;
  query?: string;
}

const conversationList: ActionDefinition<Input> = {
  key: "conversation-list",
  type: "read",
  resource: "conversation",
  title: "List Conversations",
  description:
    "List conversations, with the agents, evals and costs the vendor returns alongside them.",
  params: [queryParam, ...paginationParams()],
  output: [
    { key: "results", type: "array", label: "Conversations" },
    { key: "agents", type: "object", label: "Agents referenced by the results" },
    { key: "evals", type: "object", label: "Eval results" },
    { key: "costs", type: "object", label: "Cost breakdowns" },
  ],

  execute(input, ctx) {
    return new RelevanceAiClient(ctx).json("/agents/conversations/list", {
      query: { query: input.query, page: input.page, page_size: input.pageSize },
    });
  },
};

export default conversationList;
