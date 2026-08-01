import type { ActionDefinition } from "@w6w/types";
import { ElasticClient } from "../lib/client.ts";

interface Input {
  pattern?: string;
  health?: string;
}

/**
 * `GET /_cat/indices?format=json` — the compact-JSON form of the `_cat` API,
 * one row per index with doc counts, store size and health. `pattern` (a
 * comma-separated list of index names/wildcards) narrows it via the same
 * path segment `_cat/indices` accepts.
 */
const indexList: ActionDefinition<Input> = {
  key: "index-list",
  type: "read",
  resource: "index",
  title: "List Indices",
  description: "List indices on the cluster, with doc counts, size and health per index.",
  params: [
    {
      key: "pattern",
      label: "Index pattern",
      type: "string",
      hint: "Comma-separated index names or wildcard patterns. Empty = all indices.",
    },
    {
      key: "health",
      label: "Health filter",
      type: "select",
      options: [
        { value: "green", label: "Green" },
        { value: "yellow", label: "Yellow" },
        { value: "red", label: "Red" },
      ],
    },
  ],
  output: [{ key: "indices", type: "array", label: "Indices" }],

  execute(input, ctx) {
    const client = ElasticClient.fromConnection(ctx);
    const path = input.pattern
      ? `/_cat/indices/${encodeURIComponent(input.pattern)}`
      : `/_cat/indices`;
    return client.request(path, { query: { format: "json", health: input.health } });
  },
};

export default indexList;
