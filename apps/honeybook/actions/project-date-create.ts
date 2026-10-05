import type { ActionDefinition } from "@w6w/types";
import { encodeId, HoneyBookClient } from "../lib/client.ts";

interface Input {
  projectId: string;
}

const projectDateCreate: ActionDefinition<Input> = {
  key: "project-date-create",
  type: "perform",
  resource: "project",
  title: "Add Project Date",
  description:
    "Add a project date. Appends a new, empty additional date with an auto-generated default label; populate its fields afterwards via PATCH /projects/:id/dates/:date_id.",
  idempotent: false,
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "Project id (BSON ObjectId hex).",
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
    const result = await new HoneyBookClient(ctx).request(
      "POST",
      `/projects/${encodeId(input.projectId)}/dates`,
    );
    return result;
  },
};

export default projectDateCreate;
