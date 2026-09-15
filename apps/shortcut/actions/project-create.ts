import type { ActionDefinition } from "@w6w/types";
import { compact, ShortcutClient } from "../lib/client.ts";
import { colorParam } from "../lib/params.ts";

/**
 * `POST /api/v3/projects` — create a Project.
 *
 * `teamId` is **required** and is a plain integer — the legacy field name for
 * what Shortcut's UI now calls a "Group". It is a different id space from the
 * UUID `group_id` that Stories, Epics and Iterations use to reference the same
 * Group; there is no way to derive one from the other through this API.
 */
interface Input {
  name: string;
  teamId: number;
  description?: string;
  abbreviation?: string;
  color?: string;
  startTime?: string;
  iterationLength?: number;
  externalId?: string;
}

const projectCreate: ActionDefinition<Input> = {
  key: "project-create",
  type: "perform",
  resource: "project",
  title: "Create Project",
  description: "Create a new Project.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "teamId",
      label: "Team (Group) ID",
      type: "number",
      required: true,
      validation: { integer: true },
      hint: "The legacy numeric id of the Group this Project belongs to — not the same id " +
        "space as a Group's UUID `group_id`.",
    },
    { key: "description", label: "Description", type: "text" },
    { key: "abbreviation", label: "Abbreviation", type: "string" },
    colorParam,
    { key: "startTime", label: "Start time", type: "datetime" },
    {
      key: "iterationLength",
      label: "Iteration length (days)",
      type: "number",
      validation: { integer: true, min: 1 },
    },
    { key: "externalId", label: "External ID", type: "string" },
  ],
  output: [{ key: "data", type: "object", label: "The created Project" }],

  execute(input, ctx) {
    return new ShortcutClient(ctx).post(
      "/projects",
      compact({
        name: input.name,
        team_id: input.teamId,
        description: input.description,
        abbreviation: input.abbreviation,
        color: input.color,
        start_time: input.startTime,
        iteration_length: input.iterationLength,
        external_id: input.externalId,
      }),
    );
  },
};

export default projectCreate;
