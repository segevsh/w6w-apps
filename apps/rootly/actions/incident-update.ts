import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  itemResult,
  jsonApiBody,
  jsonValue,
  RootlyClient,
  seg,
  strList,
} from "../lib/client.ts";

interface Input {
  id: string;
  title?: string;
  summary?: string;
  public_title?: string;
  kind?:
    | "test"
    | "test_sub"
    | "example"
    | "example_sub"
    | "normal"
    | "normal_sub"
    | "backfilled"
    | "scheduled"
    | "scheduled_sub";
  status?:
    | "in_triage"
    | "started"
    | "detected"
    | "acknowledged"
    | "mitigated"
    | "resolved"
    | "closed"
    | "cancelled"
    | "scheduled"
    | "in_progress"
    | "completed";
  private?: boolean;
  severity_id?: string;
  environment_ids?: string[] | string;
  incident_type_ids?: string[] | string;
  service_ids?: string[] | string;
  functionality_ids?: string[] | string;
  group_ids?: string[] | string;
  cause_ids?: string[] | string;
  alert_ids?: string[] | string;
  labels?: unknown;
  parent_incident_id?: string;
  duplicate_incident_id?: string;
  started_at?: string;
  detected_at?: string;
  acknowledged_at?: string;
  mitigated_at?: string;
  resolved_at?: string;
  mitigation_message?: string;
  resolution_message?: string;
  cancellation_message?: string;
}

/** `PUT /v1/incidents/{id}` */
const incidentUpdate: ActionDefinition<Input> = {
  key: "incident-update",
  type: "perform",
  resource: "incident",
  title: "Update Incident",
  description:
    "Change attributes of an incident. Only the attributes you set are sent; an empty value cannot be used to clear a field here.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Incident ID",
      type: "string",
      required: true,
    },
    {
      key: "title",
      label: "Title",
      type: "string",
      hint: "Incident title. Rootly generates one when omitted.",
    },
    {
      key: "summary",
      label: "Summary",
      type: "text",
    },
    {
      key: "public_title",
      label: "Public title",
      type: "string",
      hint: "Title shown on the status page.",
    },
    {
      key: "kind",
      label: "Kind",
      type: "select",
      options: [
        { value: "test", label: "test" },
        { value: "test_sub", label: "test_sub" },
        { value: "example", label: "example" },
        { value: "example_sub", label: "example_sub" },
        { value: "normal", label: "normal" },
        { value: "normal_sub", label: "normal_sub" },
        { value: "backfilled", label: "backfilled" },
        { value: "scheduled", label: "scheduled" },
        { value: "scheduled_sub", label: "scheduled_sub" },
      ],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "in_triage", label: "in_triage" },
        { value: "started", label: "started" },
        { value: "detected", label: "detected" },
        { value: "acknowledged", label: "acknowledged" },
        { value: "mitigated", label: "mitigated" },
        { value: "resolved", label: "resolved" },
        { value: "closed", label: "closed" },
        { value: "cancelled", label: "cancelled" },
        { value: "scheduled", label: "scheduled" },
        { value: "in_progress", label: "in_progress" },
        { value: "completed", label: "completed" },
      ],
    },
    {
      key: "private",
      label: "Private",
      type: "boolean",
    },
    {
      key: "severity_id",
      label: "Severity ID",
      type: "string",
      hint: "From List Severities.",
    },
    {
      key: "environment_ids",
      label: "Environment IDs",
      type: "array",
      item: { type: "string" },
      hint: "From List Environments.",
    },
    {
      key: "incident_type_ids",
      label: "Incident type IDs",
      type: "array",
      item: { type: "string" },
    },
    {
      key: "service_ids",
      label: "Service IDs",
      type: "array",
      item: { type: "string" },
      hint: "From List Services.",
    },
    {
      key: "functionality_ids",
      label: "Functionality IDs",
      type: "array",
      item: { type: "string" },
      hint: "From List Functionalities.",
    },
    {
      key: "group_ids",
      label: "Team IDs",
      type: "array",
      item: { type: "string" },
      hint: "Rootly calls teams `groups` on the wire; from List Teams.",
    },
    {
      key: "cause_ids",
      label: "Cause IDs",
      type: "array",
      item: { type: "string" },
    },
    {
      key: "alert_ids",
      label: "Alert IDs",
      type: "array",
      item: { type: "string" },
      hint: "Alerts to attach to the incident.",
    },
    {
      key: "labels",
      label: "Labels",
      type: "json",
      hint: "JSON object of label key/value pairs.",
    },
    {
      key: "parent_incident_id",
      label: "Parent incident ID",
      type: "string",
    },
    {
      key: "duplicate_incident_id",
      label: "Duplicate of incident ID",
      type: "string",
    },
    {
      key: "started_at",
      label: "Started at",
      type: "string",
      hint: "ISO 8601.",
    },
    {
      key: "detected_at",
      label: "Detected at",
      type: "string",
      hint: "ISO 8601.",
    },
    {
      key: "acknowledged_at",
      label: "Acknowledged at",
      type: "string",
      hint: "ISO 8601.",
    },
    {
      key: "mitigated_at",
      label: "Mitigated at",
      type: "string",
      hint: "ISO 8601.",
    },
    {
      key: "resolved_at",
      label: "Resolved at",
      type: "string",
      hint: "ISO 8601.",
    },
    {
      key: "mitigation_message",
      label: "Mitigation message",
      type: "text",
    },
    {
      key: "resolution_message",
      label: "Resolution message",
      type: "text",
    },
    {
      key: "cancellation_message",
      label: "Cancellation message",
      type: "text",
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
    const res = await new RootlyClient(ctx).request("PUT", `/v1/incidents/${seg(input.id)}`, {
      body: jsonApiBody(
        "incidents",
        compact({
          title: input.title,
          summary: input.summary,
          public_title: input.public_title,
          kind: input.kind,
          status: input.status,
          private: input.private,
          severity_id: input.severity_id,
          environment_ids: strList(input.environment_ids),
          incident_type_ids: strList(input.incident_type_ids),
          service_ids: strList(input.service_ids),
          functionality_ids: strList(input.functionality_ids),
          group_ids: strList(input.group_ids),
          cause_ids: strList(input.cause_ids),
          alert_ids: strList(input.alert_ids),
          labels: jsonValue(input.labels),
          parent_incident_id: input.parent_incident_id,
          duplicate_incident_id: input.duplicate_incident_id,
          started_at: input.started_at,
          detected_at: input.detected_at,
          acknowledged_at: input.acknowledged_at,
          mitigated_at: input.mitigated_at,
          resolved_at: input.resolved_at,
          mitigation_message: input.mitigation_message,
          resolution_message: input.resolution_message,
          cancellation_message: input.cancellation_message,
        }),
        input.id,
      ),
    });
    return itemResult(res);
  },
};

export default incidentUpdate;
