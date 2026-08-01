import type { ActionDefinition } from "@w6w/types";
import { FigmaClient } from "../lib/client.ts";

interface Input {
  teamId: string;
}

/**
 * GET /v1/teams/{team_id}/projects — list the projects visible to the
 * authenticated user within a team. Requires `projects:read`.
 */
const getTeamProjects: ActionDefinition<Input> = {
  key: "get-team-projects",
  type: "read",
  resource: "project",
  title: "Get Team Projects",
  description: "List the projects in a Figma team.",
  params: [
    {
      key: "teamId",
      label: "Team ID",
      type: "string",
      required: true,
      hint: "From the team page URL: figma.com/files/team/{team_id}/...",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Team name" },
    { key: "projects", type: "array", label: "Projects" },
  ],

  execute(input, ctx) {
    const client = new FigmaClient(ctx);
    return client.request(`/v1/teams/${encodeURIComponent(input.teamId)}/projects`);
  },
};

export default getTeamProjects;
