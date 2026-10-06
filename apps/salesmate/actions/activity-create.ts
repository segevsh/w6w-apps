import type { ActionDefinition } from "@w6w/types";
import { compact, customFields, SalesmateClient } from "../lib/client.ts";
import { customFieldsParam, ownerParam, tagsParam } from "../lib/params.ts";

interface Input {
  title: string;
  type?: string;
  primaryContact?: number;
  primaryCompany?: number;
  relatedTo?: number;
  description?: string;
  dueDate?: string;
  duration?: number;
  followers?: unknown;
  isCalendarInvite?: boolean;
  isCompleted?: boolean;
  owner: number;
  tags?: string;
  customFields?: unknown;
}

const activityCreate: ActionDefinition<Input> = {
  key: "activity-create",
  type: "perform",
  resource: "activity",
  title: "Create Activity",
  description: "Create a activity.",
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    {
      key: "type",
      label: "Type",
      type: "string",
      hint: 'Activity type, typically "Call". Required by the API on update.',
    },
    { key: "primaryContact", label: "Contact ID", type: "number" },
    { key: "primaryCompany", label: "Company ID", type: "number", advanced: true },
    {
      key: "relatedTo",
      label: "Deal ID",
      type: "number",
      advanced: true,
      hint: "The deal the activity belongs to.",
    },
    { key: "description", label: "Description", type: "text" },
    {
      key: "dueDate",
      label: "Due date",
      type: "string",
      hint: "Passed to Salesmate as given (the sample uses an empty string for none).",
    },
    { key: "duration", label: "Duration", type: "number", advanced: true },
    {
      key: "followers",
      label: "Followers",
      type: "json",
      advanced: true,
      hint: 'Array such as [{"userId":1},{"contactId":3}].',
    },
    { key: "isCalendarInvite", label: "Send calendar invite", type: "boolean", advanced: true },
    { key: "isCompleted", label: "Completed", type: "boolean" },
    ownerParam(true),
    tagsParam,
    customFieldsParam,
  ],
  output: [
    { key: "id", type: "number", label: "Activity ID" },
    { key: "title", type: "string", label: "Title" },
  ],

  async execute(input, ctx) {
    const { customFields: custom, ...fields } = input as Input;
    const data = await new SalesmateClient(ctx).request<Record<string, unknown>>("/activity/v4", {
      method: "POST",
      body: { ...customFields(custom), ...compact(fields) },
    });
    return data ?? {};
  },
};

export default activityCreate;
