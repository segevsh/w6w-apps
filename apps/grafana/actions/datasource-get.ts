import type { ActionDefinition } from "@w6w/types";
import { GrafanaClient } from "../lib/client.ts";

interface Input {
  uid: string;
}

/**
 * `GET /api/datasources/uid/:uid` — confirmed against Grafana's own Data
 * Source HTTP API docs. The `id`-keyed sibling (`GET /api/datasources/id/:id`)
 * is documented as deprecated, so this app only offers the `uid` form.
 */
const datasourceGet: ActionDefinition<Input> = {
  key: "datasource-get",
  type: "read",
  resource: "datasource",
  title: "Get Data Source",
  description: "Retrieve a single data source by UID.",
  params: [
    { key: "uid", label: "Data Source UID", type: "string", required: true },
  ],

  execute(input, ctx) {
    const client = GrafanaClient.fromConnection(ctx);
    return client.request(`/datasources/uid/${encodeURIComponent(input.uid)}`);
  },
};

export default datasourceGet;
