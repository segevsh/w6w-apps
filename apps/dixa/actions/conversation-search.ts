import type { ActionDefinition } from "@w6w/types";
import { DixaClient } from "../lib/client.ts";
import { pagedGet, pagedOutput, pageParams, requireText } from "../lib/params.ts";

interface Input {
  query: string;
  exactMatch?: boolean;
  pageLimit?: number;
  pageKey?: string;
}

const conversationSearch: ActionDefinition<Input> = {
  key: "conversation-search",
  type: "search",
  resource: "conversation",
  title: "Search Conversations",
  description:
    "Full-text search over conversations. Each hit is `{ id, highlights }` — fetch the conversation with Get Conversation.",
  params: [
    { key: "query", label: "Query", type: "string", required: true },
    {
      key: "exactMatch",
      label: "Exact match",
      type: "boolean",
      hint: "Match the query as an exact phrase.",
    },
    ...pageParams,
  ],
  output: [...pagedOutput],

  execute(input, ctx) {
    return pagedGet(new DixaClient(ctx), "/search/conversations", {
      query: requireText(input.query, "query"),
      exactMatch: input.exactMatch,
      pageLimit: input.pageLimit,
      pageKey: input.pageKey,
    });
  },
};

export default conversationSearch;
