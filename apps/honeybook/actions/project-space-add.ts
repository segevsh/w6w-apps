import type { ActionDefinition } from "@w6w/types";
import { encodeId, HoneyBookClient } from "../lib/client.ts";

interface Input {
  projectId: string;
  spaceId: string;
}

const projectSpaceAdd: ActionDefinition<Input> = {
  key: "project-space-add",
  type: "perform",
  resource: "project",
  title: "Add Project Space",
  description:
    "Add a company space (a named venue/location from the company's spaces) to a project (idempotent).",
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
      key: "spaceId",
      label: "Space ID",
      type: "string",
      required: true,
      hint: "Company space (named venue) id.",
    },
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
    const result = await new HoneyBookClient(ctx).request(
      "PUT",
      `/projects/${encodeId(input.projectId)}/spaces/${encodeId(input.spaceId)}`,
    );
    return result;
  },
};

export default projectSpaceAdd;
