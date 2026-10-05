import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, HoneyBookClient, nonEmpty } from "../lib/client.ts";

interface Input {
  projectId: string;
  dateId: string;
  dateLabel?: string;
  projectDate?: string;
  projectEndDate?: string;
  projectTimeStart?: string;
  projectTimeEnd?: string;
  location?: string;
  locationLabel?: string;
  availabilityType?: string;
}

const projectDateUpdate: ActionDefinition<Input> = {
  key: "project-date-update",
  type: "perform",
  resource: "project",
  title: "Update Project Date",
  description: "Update a project date (partial).",
  idempotent: true,
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "Project id (BSON ObjectId hex).",
    },
    {
      key: "dateId",
      label: "Date ID",
      type: "string",
      required: true,
      hint: "Additional-date id.",
    },
    { key: "dateLabel", label: "Label", type: "string" },
    { key: "projectDate", label: "Date", type: "date" },
    { key: "projectEndDate", label: "End date", type: "date" },
    { key: "projectTimeStart", label: "Start time", type: "string" },
    { key: "projectTimeEnd", label: "End time", type: "string" },
    { key: "location", label: "Location", type: "string" },
    { key: "locationLabel", label: "Location label", type: "string" },
    {
      key: "availabilityType",
      label: "Availability",
      type: "select",
      options: [{ "value": "busy", "label": "Busy" }, { "value": "free", "label": "Free" }],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Id" },
    { key: "date_label", type: "string", label: "Date label" },
    { key: "project_date", type: "string", label: "Project date" },
    { key: "project_end_date", type: "string", label: "Project end date" },
    { key: "project_time_start", type: "string", label: "Project time start" },
    { key: "project_time_end", type: "string", label: "Project time end" },
    { key: "location", type: "string", label: "Location" },
    { key: "location_label", type: "string", label: "Location label" },
    { key: "availability_type", type: "string", label: "Availability type" },
  ],

  async execute(input, ctx) {
    const body = compact({
      date_label: input.dateLabel,
      project_date: input.projectDate,
      project_end_date: input.projectEndDate,
      project_time_start: input.projectTimeStart,
      project_time_end: input.projectTimeEnd,
      location: input.location,
      location_label: input.locationLabel,
      availability_type: input.availabilityType,
    });
    const result = await new HoneyBookClient(ctx).request(
      "PATCH",
      `/projects/${encodeId(input.projectId)}/dates/${encodeId(input.dateId)}`,
      {
        body: nonEmpty(body),
      },
    );
    return result;
  },
};

export default projectDateUpdate;
