import type { ActionDefinition } from "@w6w/types";
import { SplunkClient } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  count?: number;
  offset?: number;
  datatype?: string;
}

/** List Splunk indexes visible to this credential. */
const indexGetMany: ActionDefinition<Input> = {
  key: "index-get-many",
  type: "search",
  resource: "index",
  title: "List Indexes",
  description: "List indexes visible to this credential.",
  params: [
    {
      key: "datatype",
      label: "Data type",
      type: "select",
      default: "event",
      options: [
        { value: "event", label: "Event indexes" },
        { value: "metric", label: "Metric indexes" },
        { value: "all", label: "All" },
      ],
      hint: "Splunk's REST API only returns event indexes unless told otherwise.",
    },
    ...pagination,
  ],
  output: [{ key: "entry", type: "array", label: "Indexes" }],

  execute(input, ctx) {
    return new SplunkClient(ctx).request("/services/data/indexes", {
      query: { count: input.count, offset: input.offset, datatype: input.datatype },
    });
  },
};

export default indexGetMany;
