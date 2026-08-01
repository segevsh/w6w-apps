import type { ActionDefinition } from "@w6w/types";
import { GrafanaClient } from "../lib/client.ts";

/**
 * `GET /api/datasources` — confirmed against Grafana's own Data Source HTTP
 * API docs. Returns every data source configured on the instance the
 * caller's org can see.
 */
const datasourceList: ActionDefinition<Record<string, never>> = {
  key: "datasource-list",
  type: "read",
  resource: "datasource",
  title: "List Data Sources",
  description: "List every data source configured on this Grafana instance.",
  params: [],
  output: [{ key: "datasources", type: "array", label: "Data sources" }],

  execute(_input, ctx) {
    const client = GrafanaClient.fromConnection(ctx);
    return client.request("/datasources");
  },
};

export default datasourceList;
