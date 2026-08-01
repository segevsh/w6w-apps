import type { ActionDefinition } from "@w6w/types";
import { SplunkClient } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  count?: number;
  offset?: number;
}

/** List saved searches (Splunk Web calls these "Reports") this credential can see. */
const savedSearchGetMany: ActionDefinition<Input> = {
  key: "saved-search-get-many",
  type: "search",
  resource: "saved-search",
  title: "List Saved Searches",
  description: 'List saved searches (Splunk Web\'s "Reports") visible to this credential.',
  params: [...pagination],
  output: [{ key: "entry", type: "array", label: "Saved searches" }],

  execute(input, ctx) {
    return new SplunkClient(ctx).request("/services/saved/searches", {
      query: { count: input.count, offset: input.offset },
    });
  },
};

export default savedSearchGetMany;
