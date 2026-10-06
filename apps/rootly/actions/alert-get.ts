import type { ActionDefinition } from "@w6w/types";
import { itemResult, RootlyClient, seg, strList } from "../lib/client.ts";

interface Input {
  id: string;
  include?: string[] | string;
}

/** `GET /v1/alerts/{id}` */
const alertGet: ActionDefinition<Input> = {
  key: "alert-get",
  type: "read",
  resource: "alert",
  title: "Get Alert",
  description: "Fetch one alert by ID.",
  params: [
    {
      key: "id",
      label: "Alert ID",
      type: "string",
      required: true,
    },
    {
      key: "include",
      label: "Include",
      type: "array",
      item: { type: "string" },
      hint:
        "Related records to side-load, comma-separated: environments, services, groups, functionalities, responders, incidents, notified_users, events, alert_urgency, heartbeat, live_call_router, alert_group, group_leader_alert, group_member_alerts, alert_field_values, alerting_targets, escalation_policies, alert_call_recording.",
    },
  ],
  output: [
    {
      key: "item",
      type: "object",
      label: "The record, flattened to its attributes plus `id` and `type`",
    },
    { key: "included", type: "array", label: "Side-loaded related records (same flattened shape)" },
  ],

  async execute(input, ctx) {
    const res = await new RootlyClient(ctx).request("GET", `/v1/alerts/${seg(input.id)}`, {
      query: {
        "include": strList(input.include)?.join(","),
      },
    });
    return itemResult(res);
  },
};

export default alertGet;
