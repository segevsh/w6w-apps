import type { ActionDefinition } from "@w6w/types";
import { TwitterClient } from "../lib/client.ts";
import { joinFields, tweetFields } from "../lib/params.ts";

interface Input {
  query: string;
  maxResults?: number;
  sortOrder?: string;
  startTime?: string;
  endTime?: string;
  tweetFields?: string[];
}

interface SearchResponse {
  data?: Array<Record<string, unknown>>;
  meta?: Record<string, unknown>;
}

/**
 * `GET /2/tweets/search/recent` (tweet.read + users.read) — the last 7 days
 * only; full-archive search needs a separate, more restricted endpoint this
 * app does not implement. Billed per post read under X's pay-per-use pricing
 * — see README.
 */
const tweetSearchRecent: ActionDefinition<Input, SearchResponse> = {
  key: "tweet-search-recent",
  type: "search",
  resource: "tweet",
  title: "Search Recent Tweets",
  description: "Search tweets from the last 7 days matching a query.",
  params: [
    {
      key: "query",
      label: "Search query",
      type: "string",
      required: true,
      hint:
        "Up to 512 characters, X's query-operator syntax. See docs.x.com/x-api/posts/search/integrate/build-a-query.",
    },
    {
      key: "maxResults",
      label: "Max results",
      type: "number",
      default: 10,
      validation: { min: 10, max: 100, integer: true },
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      default: "recency",
      options: [
        { value: "recency", label: "Recent" },
        { value: "relevancy", label: "Relevant" },
      ],
      advanced: true,
    },
    { key: "startTime", label: "Start time", type: "datetime", advanced: true },
    { key: "endTime", label: "End time", type: "datetime", advanced: true },
    tweetFields,
  ],
  output: [
    { key: "data", type: "array", label: "Tweets" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    return new TwitterClient(ctx).request<SearchResponse>("/tweets/search/recent", {
      query: {
        query: input.query,
        max_results: input.maxResults,
        sort_order: input.sortOrder,
        start_time: input.startTime,
        end_time: input.endTime,
        "tweet.fields": joinFields(input.tweetFields),
      },
    });
  },
};

export default tweetSearchRecent;
