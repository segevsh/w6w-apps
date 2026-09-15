import type { ActionDefinition } from "@w6w/types";
import { compact, ShortcutClient } from "../lib/client.ts";
import { colorParam, projectIdParam } from "../lib/params.ts";

interface Input {
  projectId: number;
  name?: string;
  description?: string;
  abbreviation?: string;
  color?: string;
  archived?: boolean;
  teamId?: number;
}

const projectUpdate: ActionDefinition<Input> = {
  key: "project-update",
  type: "perform",
  resource: "project",
  title: "Update Project",
  description: "Update an existing Project. Only the fields you set are changed.",
  idempotent: true,
  params: [
    projectIdParam,
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "abbreviation", label: "Abbreviation", type: "string" },
    colorParam,
    { key: "archived", label: "Archived", type: "boolean" },
    {
      key: "teamId",
      label: "Team (Group) ID",
      type: "number",
      validation: { integer: true },
      hint: "The legacy numeric Group id — see `project-create`.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The updated Project" }],

  execute(input, ctx) {
    return new ShortcutClient(ctx).put(
      `/projects/${input.projectId}`,
      compact({
        name: input.name,
        description: input.description,
        abbreviation: input.abbreviation,
        color: input.color,
        archived: input.archived,
        team_id: input.teamId,
      }),
    );
  },
};

export default projectUpdate;
