import type { ActionDefinition } from "@w6w/types";
import { WorkDriveClient } from "../lib/client.ts";

interface Input {
  teamFolderId: string;
}

/** `GET /teamfolders/{teamfolder_id}`. */
const teamFolderGet: ActionDefinition<Input> = {
  key: "team-folder-get",
  type: "read",
  resource: "team-folder",
  title: "Get Team Folder",
  description: "Fetch a team folder's details (storage, visibility, capabilities).",
  params: [{ key: "teamFolderId", label: "Team Folder ID", type: "string", required: true }],
  output: [{ key: "item", type: "object", label: "Team folder resource (JSON:API `data`)" }],

  async execute(input, ctx) {
    const body = await new WorkDriveClient(ctx).get(
      `/teamfolders/${encodeURIComponent(input.teamFolderId)}`,
    );
    return { item: body.data ?? null };
  },
};

export default teamFolderGet;
