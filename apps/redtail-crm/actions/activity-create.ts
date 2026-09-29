import type { ActionDefinition } from "@w6w/types";
import { compact, RedtailClient } from "../lib/client.ts";
import type { RedtailActivity, RedtailActivityInput } from "../lib/types.ts";

interface Input {
  subject: string;
  activityCodeId?: number;
  categoryId?: number;
  allDay?: boolean;
  startDate?: string;
  endDate?: string;
  description?: string;
  location?: string;
  contactId?: number;
}

interface Output {
  activity: RedtailActivity;
}

const activityCreate: ActionDefinition<Input, Output> = {
  key: "activity-create",
  type: "perform",
  resource: "activity",
  title: "Create Activity",
  description: "Schedule an activity (task, appointment or call), optionally linked to a contact.",
  idempotent: false,
  params: [
    { key: "subject", label: "Subject", type: "string", required: true },
    {
      key: "activityCodeId",
      label: "Activity code ID",
      type: "number",
      hint: "From GET /lists/activity_codes.",
    },
    { key: "categoryId", label: "Category ID", type: "number", advanced: true },
    { key: "allDay", label: "All day", type: "boolean" },
    { key: "startDate", label: "Start date/time", type: "datetime" },
    { key: "endDate", label: "End date/time", type: "datetime" },
    { key: "description", label: "Description", type: "text" },
    { key: "location", label: "Location", type: "string" },
    {
      key: "contactId",
      label: "Link to contact ID",
      type: "number",
      hint: "Sent as `linked_contacts: [{ contact_id }]`, per the docs' own create examples.",
    },
  ],
  output: [
    { key: "activity.id", type: "number", label: "Activity ID" },
    { key: "activity.subject", type: "string", label: "Subject" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "creating Redtail activity", { subject: input.subject });
    const body: RedtailActivityInput = compact({
      subject: input.subject,
      activity_code_id: input.activityCodeId,
      category_id: input.categoryId,
      all_day: input.allDay,
      start_date: input.startDate,
      end_date: input.endDate,
      description: input.description,
      location: input.location,
      linked_contacts: input.contactId ? [{ contact_id: input.contactId }] : undefined,
    }) as RedtailActivityInput;
    const res = await new RedtailClient(ctx).request<Output>("/activities", {
      method: "POST",
      body,
    });
    return res.data;
  },
};

export default activityCreate;
