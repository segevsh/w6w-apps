import type { ActionDefinition } from "@w6w/types";
import { GrafanaClient } from "../lib/client.ts";

interface Input {
  uid: string;
}

/**
 * `GET /api/v1/provisioning/alert-rules/:uid` — confirmed against Grafana's
 * own Alerting Provisioning HTTP API docs.
 */
const alertRuleGet: ActionDefinition<Input> = {
  key: "alert-rule-get",
  type: "read",
  resource: "alert-rule",
  title: "Get Alert Rule",
  description: "Retrieve a single Grafana-managed alert rule by UID.",
  params: [
    { key: "uid", label: "Alert Rule UID", type: "string", required: true },
  ],

  execute(input, ctx) {
    const client = GrafanaClient.fromConnection(ctx);
    return client.request(`/v1/provisioning/alert-rules/${encodeURIComponent(input.uid)}`);
  },
};

export default alertRuleGet;
