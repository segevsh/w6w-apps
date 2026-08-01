import type { ActionDefinition } from "@w6w/types";
import { SplunkClient, unset } from "../lib/client.ts";

interface Input {
  search: string;
  earliestTime?: string;
  latestTime?: string;
  maxCount?: number;
}

/**
 * `exec_mode=oneshot` runs the search on the request thread and returns its
 * results directly — no job, nothing to poll. Honest tradeoff: the request
 * blocks for as long as the search takes, so this is for searches you expect
 * to finish quickly. For anything that might run long, use `search-create` +
 * `search-get` + `search-get-results` instead.
 */
const searchOneshot: ActionDefinition<Input> = {
  key: "search-oneshot",
  type: "search",
  resource: "search",
  title: "Run Search (Oneshot)",
  description:
    "Run a search synchronously and get results back directly. Blocks until done — use `search-create` for anything that might run long.",
  params: [
    {
      key: "search",
      label: "Search",
      type: "code",
      required: true,
      placeholder: "search index=_internal | head 10",
      hint:
        "Splunk Search Processing Language. Must start with a generating command (`search`, `| tstats`, …).",
    },
    {
      key: "earliestTime",
      label: "Earliest time",
      type: "string",
      row: "time",
      placeholder: "-15m",
    },
    {
      key: "latestTime",
      label: "Latest time",
      type: "string",
      row: "time",
      placeholder: "now",
    },
    {
      key: "maxCount",
      label: "Max results",
      type: "number",
      default: 100,
      validation: { min: 1, integer: true },
      hint: "Splunk's `count` parameter — caps how many result rows come back.",
    },
  ],
  output: [
    { key: "results", type: "array", label: "Result rows" },
    { key: "fields", type: "array", label: "Field metadata" },
  ],

  execute(input, ctx) {
    return new SplunkClient(ctx).request("/services/search/jobs", {
      method: "POST",
      form: {
        search: input.search,
        earliest_time: unset(input.earliestTime),
        latest_time: unset(input.latestTime),
        exec_mode: "oneshot",
        count: input.maxCount,
      },
    });
  },
};

export default searchOneshot;
