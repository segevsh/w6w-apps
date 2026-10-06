import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  itemResult,
  jsonApiBody,
  jsonValue,
  RootlyClient,
  strList,
} from "../lib/client.ts";

interface Input {
  summary: string;
  source?: string;
  description?: string;
  status?: "open" | "triggered";
  noise?: "noise" | "not_noise";
  service_ids?: string[] | string;
  group_ids?: string[] | string;
  functionality_ids?: string[] | string;
  environment_ids?: string[] | string;
  started_at?: string;
  ended_at?: string;
  external_id?: string;
  external_url?: string;
  alert_urgency_id?: string;
  notification_target_type?: "User" | "Group" | "EscalationPolicy" | "Service" | "Functionality";
  notification_target_id?: string;
  labels?: unknown;
  data?: unknown;
  deduplication_key?: string;
}

/** `POST /v1/alerts` */
const alertCreate: ActionDefinition<Input> = {
  key: "alert-create",
  type: "perform",
  resource: "alert",
  title: "Create Alert",
  description:
    "Create an alert. It can notify a user, team, escalation policy, service or functionality, and may open an incident per the account's alert routing.",
  idempotent: false,
  params: [
    {
      key: "summary",
      label: "Summary",
      type: "string",
      required: true,
      hint: "One-line alert summary.",
    },
    {
      key: "source",
      label: "Source",
      type: "string",
      hint: "Where the alert came from, e.g. `api`, `datadog`.",
    },
    {
      key: "description",
      label: "Description",
      type: "text",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "open", label: "open" }, { value: "triggered", label: "triggered" }],
    },
    {
      key: "noise",
      label: "Noise",
      type: "select",
      options: [{ value: "noise", label: "noise" }, { value: "not_noise", label: "not_noise" }],
    },
    {
      key: "service_ids",
      label: "Service IDs",
      type: "array",
      item: { type: "string" },
    },
    {
      key: "group_ids",
      label: "Team IDs",
      type: "array",
      item: { type: "string" },
      hint: "Rootly calls teams `groups` on the wire.",
    },
    {
      key: "functionality_ids",
      label: "Functionality IDs",
      type: "array",
      item: { type: "string" },
    },
    {
      key: "environment_ids",
      label: "Environment IDs",
      type: "array",
      item: { type: "string" },
    },
    {
      key: "started_at",
      label: "Started at",
      type: "string",
      hint: "ISO 8601.",
    },
    {
      key: "ended_at",
      label: "Ended at",
      type: "string",
      hint: "ISO 8601.",
    },
    {
      key: "external_id",
      label: "External ID",
      type: "string",
    },
    {
      key: "external_url",
      label: "External URL",
      type: "string",
    },
    {
      key: "alert_urgency_id",
      label: "Alert urgency ID",
      type: "string",
    },
    {
      key: "notification_target_type",
      label: "Notify target type",
      type: "select",
      options: [
        { value: "User", label: "User" },
        { value: "Group", label: "Group" },
        { value: "EscalationPolicy", label: "EscalationPolicy" },
        { value: "Service", label: "Service" },
        { value: "Functionality", label: "Functionality" },
      ],
    },
    {
      key: "notification_target_id",
      label: "Notify target ID",
      type: "string",
    },
    {
      key: "labels",
      label: "Labels",
      type: "json",
      hint: 'JSON array of `{"key": "...", "value": "..."}` objects.',
    },
    {
      key: "data",
      label: "Raw data",
      type: "json",
      hint: "Free-form JSON payload kept on the alert.",
    },
    {
      key: "deduplication_key",
      label: "Deduplication key",
      type: "string",
      hint: "Alerts sharing a key are grouped.",
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
    const res = await new RootlyClient(ctx).request("POST", "/v1/alerts", {
      body: jsonApiBody(
        "alerts",
        compact({
          summary: input.summary,
          source: input.source,
          description: input.description,
          status: input.status,
          noise: input.noise,
          service_ids: strList(input.service_ids),
          group_ids: strList(input.group_ids),
          functionality_ids: strList(input.functionality_ids),
          environment_ids: strList(input.environment_ids),
          started_at: input.started_at,
          ended_at: input.ended_at,
          external_id: input.external_id,
          external_url: input.external_url,
          alert_urgency_id: input.alert_urgency_id,
          notification_target_type: input.notification_target_type,
          notification_target_id: input.notification_target_id,
          labels: jsonValue(input.labels),
          data: jsonValue(input.data),
          deduplication_key: input.deduplication_key,
        }),
      ),
    });
    return itemResult(res);
  },
};

export default alertCreate;
