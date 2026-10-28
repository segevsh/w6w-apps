import type { ActionDefinition } from "@w6w/types";
import { jsonApiBody, WorkDriveClient } from "../lib/client.ts";
import { teamId } from "../lib/params.ts";

interface Input {
  teamId: string;
  name: string;
  isPublicWithinTeam: boolean;
  description?: string;
}

/** `POST /teamfolders` — `data.attributes.parent_id` is the TEAM id. */
const teamFolderCreate: ActionDefinition<Input> = {
  key: "team-folder-create",
  type: "perform",
  resource: "team-folder",
  title: "Create Team Folder",
  description: "Create a team folder in a team.",
  idempotent: false,
  params: [
    teamId,
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "isPublicWithinTeam",
      label: "Public within team",
      type: "boolean",
      required: true,
      default: false,
      hint: "true makes the team folder Public; false makes it Private.",
    },
    { key: "description", label: "Description", type: "string" },
  ],
  output: [{ key: "item", type: "object", label: "Created team folder (JSON:API `data`)" }],

  async execute(input, ctx) {
    const body = await new WorkDriveClient(ctx).request("POST", "/teamfolders", {
      body: jsonApiBody("teamfolders", {
        parent_id: input.teamId,
        name: input.name,
        is_public_within_team: input.isPublicWithinTeam === true,
        description: input.description,
      }),
    });
    return { item: body.data ?? null };
  },
};

export default teamFolderCreate;
