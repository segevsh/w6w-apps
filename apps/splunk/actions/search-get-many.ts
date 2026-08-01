import type { ActionDefinition } from "@w6w/types";
import { SplunkClient } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  count?: number;
  offset?: number;
}

/** List currently known search jobs (running, queued or recently finished) on this stack. */
const searchGetMany: ActionDefinition<Input> = {
  key: "search-get-many",
  type: "search",
  resource: "search",
  title: "List Search Jobs",
  description: "List search jobs visible to this credential.",
  params: [...pagination],
  output: [{ key: "entry", type: "array", label: "Search jobs" }],

  execute(input, ctx) {
    return new SplunkClient(ctx).request("/services/search/jobs", {
      query: { count: input.count, offset: input.offset },
    });
  },
};

export default searchGetMany;
