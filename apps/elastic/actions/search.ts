import type { ActionDefinition } from "@w6w/types";
import { ElasticClient } from "../lib/client.ts";

interface Input {
  index: string;
  query?: Record<string, unknown>;
  size?: number;
  from?: number;
  sort?: unknown;
}

/**
 * Query DSL passthrough — `query` is the full Elasticsearch Query DSL request
 * body (https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html),
 * e.g. `{ "query": { "match": { "title": "workflow" } } }`. `size`/`from`/`sort`
 * are separate convenience params that override whatever the body carries, so
 * pagination doesn't require re-editing the whole DSL blob each time.
 */
const search: ActionDefinition<Input> = {
  key: "search",
  type: "search",
  resource: "document",
  title: "Search",
  description: "Run an Elasticsearch Query DSL search against one or more indices.",
  params: [
    {
      key: "index",
      label: "Index",
      type: "string",
      required: true,
      placeholder: "my-index",
      hint: "Comma-separated index names, or an alias/wildcard pattern (e.g. `logs-*`).",
    },
    {
      key: "query",
      label: "Query (DSL)",
      type: "json",
      hint: "Full Query DSL request body. Defaults to match_all when empty.",
      default: { query: { match_all: {} } },
    },
    { key: "size", label: "Size", type: "number", hint: "Max hits to return. Overrides the body." },
    {
      key: "from",
      label: "From",
      type: "number",
      hint: "Offset for pagination. Overrides the body.",
    },
    { key: "sort", label: "Sort", type: "json", hint: "Sort clause. Overrides the body." },
  ],
  output: [
    { key: "hits", type: "object", label: "Hits envelope" },
    { key: "took", type: "number", label: "Time taken (ms)" },
  ],

  execute(input, ctx) {
    const client = ElasticClient.fromConnection(ctx);
    const body: Record<string, unknown> = { ...(input.query ?? { query: { match_all: {} } }) };
    if (input.size !== undefined) body.size = input.size;
    if (input.from !== undefined) body.from = input.from;
    if (input.sort !== undefined) body.sort = input.sort;
    return client.request(`/${encodeURIComponent(input.index)}/_search`, {
      method: "POST",
      body,
    });
  },
};

export default search;
