import type { ActionDefinition } from "@w6w/types";
import { GrafanaClient } from "../lib/client.ts";

/**
 * `GET /api/v1/provisioning/alert-rules` — confirmed against Grafana's own
 * Alerting Provisioning HTTP API docs. Lists every Grafana-managed alert
 * rule on the instance. Read-only; needs no `X-Disable-Provenance` header
 * (that's only required for write operations on provisioned resources).
 */
const alertRuleList: ActionDefinition<Record<string, never>> = {
  key: "alert-rule-list",
  type: "read",
  resource: "alert-rule",
  title: "List Alert Rules",
  description: "List every Grafana-managed alert rule on this instance.",
  params: [],
  output: [{ key: "alertRules", type: "array", label: "Alert rules" }],

  execute(_input, ctx) {
    const client = GrafanaClient.fromConnection(ctx);
    return client.request("/v1/provisioning/alert-rules");
  },
};

export default alertRuleList;
