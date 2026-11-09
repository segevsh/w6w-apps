import tweetSearchRecent from "../actions/tweet-search-recent.ts";
import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";

interface Params {
  query: string;
}

export default pollFromListAction<Params>({
  key: "new-tweet",
  title: "New Tweet",
  description: "The run gets each new recent tweet matching a search query.",
  action: tweetSearchRecent as unknown as ActionDefinition,
  input: ({ query }) => ({ query, maxResults: 100, sortOrder: "recency" }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id: unknown }).id),
  params: [{ key: "query", label: "Search query", type: "string", required: true }],
  output: [{ key: "id", type: "string", label: "Tweet ID" }],
  sample: { id: "1860000000000000000", text: "A recent tweet" },
  maxPages: 1,
});
