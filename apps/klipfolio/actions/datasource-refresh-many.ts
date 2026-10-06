import type { ActionDefinition } from "@w6w/types";
import { compact, KlipfolioClient, refreshResult, strList } from "../lib/client.ts";

interface Input {
  datasources: unknown;
}

/** `POST /datasources/@/refresh`. */
const datasourceRefreshMany: ActionDefinition<Input> = {
  key: "datasource-refresh-many",
  type: "perform",
  resource: "datasource",
  title: "Refresh Data Sources",
  description:
    "Queue several data sources for refresh in one call. Refresh is queued, not instant.",
  idempotent: false,
  params: [
    {
      key: "datasources",
      label: "Data source IDs",
      type: "text",
      required: true,
      hint: "Comma-separated data source IDs.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "total_datasources_requested", type: "number", label: "Data sources requested" },
    { key: "total_instances_requested", type: "number", label: "Instances requested" },
    { key: "total_instances_queued", type: "number", label: "Instances queued" },
    { key: "failed_results", type: "object", label: "Per-data-source failures, when any" },
  ],

  async execute(input, ctx) {
    const env = await new KlipfolioClient(ctx).request("POST", `/datasources/@/refresh`, {
      body: compact({ datasources: strList(input.datasources) }),
    });
    return refreshResult(env);
  },
};

export default datasourceRefreshMany;
