import type { ActionDefinition } from "@w6w/types";
import { compact, HoneyBookClient, nonEmpty, toList } from "../lib/client.ts";
import { projectIncludeParams } from "../lib/params.ts";

interface Input {
  name?: string;
  projectDate?: string;
  projectEndDate?: string;
  projectTimeStart?: string;
  projectTimeEnd?: string;
  projectTimezone?: string;
  projectLocation?: string;
  projectDetails?: string;
  guestCount?: number;
  budget?: number;
  availabilityType?: string;
  projectTypeId?: string;
  leadSourceId?: string;
  leadSourceOpenText?: string;
  include?: string[] | string;
  maxWorkspaces?: number;
  maxCustomFields?: number;
}

const projectCreate: ActionDefinition<Input> = {
  key: "project-create",
  type: "perform",
  resource: "project",
  title: "Create Project",
  description: "Create a project. Creates the project and its first workspace.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string" },
    { key: "projectDate", label: "Project date", type: "date" },
    { key: "projectEndDate", label: "Project end date", type: "date" },
    {
      key: "projectTimeStart",
      label: "Start time",
      type: "string",
      hint: 'Local start time, e.g. "09:00".',
    },
    { key: "projectTimeEnd", label: "End time", type: "string" },
    { key: "projectTimezone", label: "Timezone", type: "string" },
    { key: "projectLocation", label: "Location", type: "string" },
    { key: "projectDetails", label: "Details", type: "text" },
    { key: "guestCount", label: "Guest count", type: "number" },
    { key: "budget", label: "Budget", type: "number", hint: "Whole number (integer)." },
    {
      key: "availabilityType",
      label: "Availability",
      type: "select",
      options: [{ "value": "busy", "label": "Busy" }, { "value": "free", "label": "Free" }],
    },
    { key: "projectTypeId", label: "Project type ID", type: "string" },
    { key: "leadSourceId", label: "Lead source ID", type: "string" },
    { key: "leadSourceOpenText", label: "Lead source (free text)", type: "string" },
    ...projectIncludeParams,
  ],
  output: [
    { key: "id", type: "string", label: "Id" },
    { key: "name", type: "string", label: "Name" },
    { key: "project_date", type: "string", label: "Project date" },
    { key: "project_end_date", type: "string", label: "Project end date" },
    { key: "project_time_start", type: "string", label: "Project time start" },
    { key: "project_time_end", type: "string", label: "Project time end" },
    { key: "project_timezone", type: "string", label: "Project timezone" },
    { key: "project_timezone_iana", type: "string", label: "Project timezone iana" },
    { key: "project_location", type: "string", label: "Project location" },
    { key: "project_details", type: "string", label: "Project details" },
  ],

  async execute(input, ctx) {
    const body = compact({
      name: input.name,
      project_date: input.projectDate,
      project_end_date: input.projectEndDate,
      project_time_start: input.projectTimeStart,
      project_time_end: input.projectTimeEnd,
      project_timezone: input.projectTimezone,
      project_location: input.projectLocation,
      project_details: input.projectDetails,
      guest_count: input.guestCount,
      budget: input.budget,
      availability_type: input.availabilityType,
      project_type_id: input.projectTypeId,
      lead_source_id: input.leadSourceId,
      lead_source_open_text: input.leadSourceOpenText,
      include: toList(input.include),
      max_workspaces: input.maxWorkspaces,
      max_custom_fields: input.maxCustomFields,
    });
    const result = await new HoneyBookClient(ctx).request("POST", `/projects`, {
      body: nonEmpty(body),
    });
    return result;
  },
};

export default projectCreate;
