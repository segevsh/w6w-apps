import type { ActionDefinition } from "@w6w/types";
import { csv, LinearClient } from "../lib/client.ts";

interface Input {
  name: string;
  teamIds: string;
  description?: string;
  leadId?: string;
  startDate?: string;
  targetDate?: string;
}

const MUTATION = `
  mutation ProjectCreate($input: ProjectCreateInput!) {
    projectCreate(input: $input) {
      success
      project { id name url state progress startDate targetDate }
    }
  }
`;

const projectCreate: ActionDefinition<Input> = {
  key: "project-create",
  type: "perform",
  resource: "project",
  title: "Create Project",
  description: "Create a project spanning one or more teams.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "teamIds",
      label: "Team IDs",
      type: "string",
      required: true,
      hint: "Comma-separated team UUIDs the project belongs to.",
    },
    { key: "description", label: "Description", type: "text", config: { multiline: true } },
    { key: "leadId", label: "Lead user ID", type: "string" },
    { key: "startDate", label: "Start date", type: "date", row: "dates" },
    { key: "targetDate", label: "Target date", type: "date", row: "dates" },
  ],
  output: [
    { key: "projectCreate.success", type: "boolean", label: "Created" },
    { key: "projectCreate.project.id", type: "string", label: "Project ID" },
    { key: "projectCreate.project.url", type: "string", label: "URL" },
  ],

  execute(input, ctx) {
    return new LinearClient(ctx).query(MUTATION, {
      input: {
        name: input.name,
        teamIds: csv(input.teamIds),
        description: input.description || undefined,
        leadId: input.leadId || undefined,
        startDate: input.startDate || undefined,
        targetDate: input.targetDate || undefined,
      },
    });
  },
};

export default projectCreate;
