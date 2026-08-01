import type { ActionDefinition } from "@w6w/types";
import { GrafanaClient } from "../lib/client.ts";

interface Input {
  uid: string;
}

/**
 * `GET /api/dashboards/uid/:uid` — confirmed against Grafana's own Dashboard
 * HTTP API docs. Returns `{ dashboard, meta }`: the dashboard JSON model plus
 * metadata (folder, url, version, star/permission state).
 */
const dashboardGet: ActionDefinition<Input> = {
  key: "dashboard-get",
  type: "read",
  resource: "dashboard",
  title: "Get Dashboard",
  description: "Retrieve a dashboard by UID, including its full JSON model.",
  params: [
    {
      key: "uid",
      label: "Dashboard UID",
      type: "string",
      required: true,
      placeholder: "cIBgcSjkk",
    },
  ],
  output: [
    { key: "dashboard", type: "object", label: "Dashboard model" },
    { key: "meta", type: "object", label: "Metadata" },
  ],

  execute(input, ctx) {
    const client = GrafanaClient.fromConnection(ctx);
    return client.request(`/dashboards/uid/${encodeURIComponent(input.uid)}`);
  },
};

export default dashboardGet;
