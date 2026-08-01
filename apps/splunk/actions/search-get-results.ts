import type { ActionDefinition } from "@w6w/types";
import { SplunkClient } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  sid: string;
  count?: number;
  offset?: number;
}

/** Read a finished (or still-running) search job's results. Returns 204/empty until the job is done. */
const searchGetResults: ActionDefinition<Input> = {
  key: "search-get-results",
  type: "search",
  resource: "search",
  title: "Get Search Job Results",
  description:
    "Fetch result rows for a search job by `sid`. Splunk returns nothing useful until the job is done — check with `search-get` first.",
  params: [
    { key: "sid", label: "Search job ID (sid)", type: "string", required: true },
    ...pagination,
  ],
  output: [
    { key: "results", type: "array", label: "Result rows" },
    { key: "fields", type: "array", label: "Field metadata" },
  ],

  execute(input, ctx) {
    return new SplunkClient(ctx).request(
      `/services/search/jobs/${encodeURIComponent(input.sid)}/results`,
      { query: { count: input.count, offset: input.offset } },
    );
  },
};

export default searchGetResults;
