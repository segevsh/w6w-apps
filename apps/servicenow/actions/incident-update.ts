import type { ActionDefinition } from "@w6w/types";
import { compact, fieldsBody, ServiceNowClient, unset } from "../lib/client.ts";
import { contactTypeOptions, impactUrgencyOptions, incidentResultOutput } from "../lib/params.ts";

interface Input {
  sysId: string;
  shortDescription?: string;
  description?: string;
  urgency?: string;
  impact?: string;
  category?: string;
  subcategory?: string;
  assignmentGroup?: string;
  assignedTo?: string;
  contactType?: string;
  workNotes?: string;
  additionalFields?: unknown;
}

const incidentUpdate: ActionDefinition<Input> = {
  key: "incident-update",
  type: "perform",
  resource: "incident",
  title: "Update Incident",
  description: "Update fields on an existing incident (PATCH — only fields sent are changed).",
  // A partial update converges on the same field values when replayed.
  idempotent: true,
  params: [
    {
      key: "sysId",
      label: "Sys ID",
      type: "string",
      required: true,
      hint: "The record's sys_id — not the INC number.",
    },
    { key: "shortDescription", label: "Short description", type: "string" },
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
    { key: "contactType", label: "Contact type", type: "select", options: contactTypeOptions },
    {
      key: "workNotes",
      label: "Work notes",
      type: "text",
      config: { multiline: true },
      hint: "Appended to the incident's work notes journal (not a replacement).",
    },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint:
        'Any other `incident` column, e.g. { "state": "6", "close_code": "Solved (Permanently)" }.',
    },
  ],
  output: incidentResultOutput,

  execute(input, ctx) {
    return new ServiceNowClient(ctx).request(`/table/incident/${encodeURIComponent(input.sysId)}`, {
      method: "PATCH",
      body: compact({
        short_description: unset(input.shortDescription),
        description: unset(input.description),
        urgency: unset(input.urgency),
        impact: unset(input.impact),
        category: unset(input.category),
        subcategory: unset(input.subcategory),
        assignment_group: unset(input.assignmentGroup),
        assigned_to: unset(input.assignedTo),
        contact_type: unset(input.contactType),
        work_notes: unset(input.workNotes),
        ...fieldsBody(input.additionalFields),
      }),
    });
  },
};

export default incidentUpdate;
