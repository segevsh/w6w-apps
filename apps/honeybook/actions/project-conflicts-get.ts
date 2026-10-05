import type { ActionDefinition } from "@w6w/types";
import { encodeId, HoneyBookClient } from "../lib/client.ts";

interface Input {
  projectId: string;
}

const projectConflictsGet: ActionDefinition<Input> = {
  key: "project-conflicts-get",
  type: "read",
  resource: "project",
  title: "Get Project Conflicts",
  description: "Get scheduling conflicts for a project.",
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
    { key: "has_conflict", type: "boolean", label: "Has conflict" },
    { key: "lead_conflicting_project_ids", type: "array", label: "Lead conflicting project ids" },
    {
      key: "booked_conflicting_project_ids",
      type: "array",
      label: "Booked conflicting project ids",
    },
    { key: "lead_conflicting_projects", type: "array", label: "Lead conflicting projects" },
    { key: "booked_conflicting_projects", type: "array", label: "Booked conflicting projects" },
  ],

  async execute(input, ctx) {
    const result = await new HoneyBookClient(ctx).request(
      "GET",
      `/projects/${encodeId(input.projectId)}/conflicts`,
    );
    return result;
  },
};

export default projectConflictsGet;
