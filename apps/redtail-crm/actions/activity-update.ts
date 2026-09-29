import type { ActionDefinition } from "@w6w/types";
import { compact, RedtailClient } from "../lib/client.ts";
import type { RedtailActivity } from "../lib/types.ts";

interface Input {
  activityId: number;
  subject?: string;
  description?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  percentdone?: number;
  completed?: boolean;
}

interface Output {
  activity: RedtailActivity;
}

const activityUpdate: ActionDefinition<Input, Output> = {
  key: "activity-update",
  type: "perform",
  resource: "activity",
  title: "Update Activity",
  description: "Update an activity — including marking it complete. Only the fields " +
    "provided are changed.",
  idempotent: true,
  params: [
    { key: "activityId", label: "Activity ID", type: "number", required: true },
    { key: "subject", label: "Subject", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "location", label: "Location", type: "string" },
    { key: "startDate", label: "Start date/time", type: "datetime" },
    { key: "endDate", label: "End date/time", type: "datetime" },
    {
      key: "percentdone",
      label: "Percent complete",
      type: "number",
      validation: { min: 0, max: 100, integer: true },
    },
    {
      key: "completed",
      label: "Mark complete",
      type: "boolean",
      hint:
        "The Activity object's own `completed`/`completed_at` fields, per the docs' response schema.",
    },
  ],
  output: [
    { key: "activity.id", type: "number", label: "Activity ID" },
    { key: "activity.percentdone", type: "number", label: "Percent complete" },
  ],

  async execute(input, ctx) {
    const body = compact({
      subject: input.subject,
      description: input.description,
      location: input.location,
      start_date: input.startDate,
      end_date: input.endDate,
      percentdone: input.percentdone,
      completed: input.completed,
    });
    const res = await new RedtailClient(ctx).request<Output>(`/activities/${input.activityId}`, {
      method: "PUT",
      body,
    });
    return res.data;
  },
};

export default activityUpdate;
