import type { ActionDefinition } from "@w6w/types";
import { compact, fieldsBody, ServiceNowClient, unset } from "../lib/client.ts";
import { contactTypeOptions, impactUrgencyOptions, incidentResultOutput } from "../lib/params.ts";

interface Input {
  shortDescription: string;
  description?: string;
  urgency?: string;
  impact?: string;
  category?: string;
  subcategory?: string;
  assignmentGroup?: string;
  assignedTo?: string;
  callerId?: string;
  contactType?: string;
  additionalFields?: unknown;
}

/**
 * The `incident` table via the Table API. Reference fields (assignment
 * group, assignee, caller) take the record's `sys_id` — ServiceNow's choice
 * lists (category, state, close code, …) are per-instance customizable, so
 * this app takes them as plain strings rather than guessing a fixed set of
 * options that may not match your instance.
 */
const incidentCreate: ActionDefinition<Input> = {
  key: "incident-create",
  type: "perform",
  resource: "incident",
  title: "Create Incident",
  description: "Open an incident on the `incident` table.",
  // ServiceNow mints a new sys_id per call.
  idempotent: false,
  params: [
    { key: "shortDescription", label: "Short description", type: "string", required: true },
    { key: "description", label: "Description", type: "text", config: { multiline: true } },
    {
      key: "urgency",
      label: "Urgency",
      type: "select",
      options: impactUrgencyOptions,
      row: "impact-urgency",
    },
    {
      key: "impact",
      label: "Impact",
      type: "select",
      options: impactUrgencyOptions,
      row: "impact-urgency",
    },
    { key: "category", label: "Category", type: "string", row: "category" },
    { key: "subcategory", label: "Subcategory", type: "string", row: "category" },
    {
      key: "assignmentGroup",
      label: "Assignment group sys_id",
      type: "string",
      row: "route",
      hint: "sys_id of a `sys_user_group` record.",
    },
    {
      key: "assignedTo",
      label: "Assigned to sys_id",
      type: "string",
      row: "route",
      hint: "sys_id of a `sys_user` record.",
    },
    {
      key: "callerId",
      label: "Caller sys_id",
      type: "string",
      hint: "sys_id of the `sys_user` record reporting the incident.",
    },
    { key: "contactType", label: "Contact type", type: "select", options: contactTypeOptions },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint:
        'Any other `incident` column, e.g. { "state": "2", "close_code": "Solved (Permanently)" }.',
    },
  ],
  output: incidentResultOutput,

  execute(input, ctx) {
    return new ServiceNowClient(ctx).request("/table/incident", {
      method: "POST",
      body: compact({
        short_description: input.shortDescription,
        description: unset(input.description),
        urgency: unset(input.urgency),
        impact: unset(input.impact),
        category: unset(input.category),
        subcategory: unset(input.subcategory),
        assignment_group: unset(input.assignmentGroup),
        assigned_to: unset(input.assignedTo),
        caller_id: unset(input.callerId),
        contact_type: unset(input.contactType),
        ...fieldsBody(input.additionalFields),
      }),
    });
  },
};

export default incidentCreate;
