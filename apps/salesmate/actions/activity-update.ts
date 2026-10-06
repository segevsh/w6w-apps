import type { ActionDefinition } from "@w6w/types";
import { compact, customFields, SalesmateClient } from "../lib/client.ts";
import { customFieldsParam, idParam, ownerParam, tagsParam } from "../lib/params.ts";

interface Input {
  activityId: number;
  title: string;
  type: string;
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

const activityUpdate: ActionDefinition<Input> = {
  key: "activity-update",
  type: "perform",
  resource: "activity",
  title: "Update Activity",
  description:
    "Update a activity. Salesmate's update takes the full required field set, not just the changes.",
  idempotent: true,
  params: [
    idParam("activityId", "Activity ID"),
    { key: "title", label: "Title", type: "string", required: true },
    {
      key: "type",
      label: "Type",
      type: "string",
      required: true,
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
    const { activityId: _id, customFields: custom, ...fields } = input as Input & {
      activityId?: number;
    };
    const data = await new SalesmateClient(ctx).request<Record<string, unknown>>(
      `/activity/v4/${input.activityId}`,
      {
        method: "PUT",
        body: { ...customFields(custom), ...compact(fields) },
      },
    );
    return data ?? {};
  },
};

export default activityUpdate;
