import type { ActionDefinition } from "@w6w/types";
import { listResult, WorkDriveClient } from "../lib/client.ts";
import { limit, listOutput, offset, teamId } from "../lib/params.ts";

interface Input {
  teamId: string;
  type?: string;
  limit?: number;
  offset?: number;
}

/** `GET /teams/{team_id}/teamfolders`. */
const teamFolderList: ActionDefinition<Input> = {
  key: "team-folder-list",
  type: "read",
  resource: "team-folder",
  title: "List Team Folders",
  description: "List the team folders in a team.",
  params: [
    teamId,
    {
      key: "type",
      label: "Team Folder Type Filter",
      type: "string",
      hint: "Optional filter[type], e.g. userjoinedws.",
    },
    limit,
    offset,
  ],
  output: [...listOutput],

  async execute(input, ctx) {
    const body = await new WorkDriveClient(ctx).get(
      `/teams/${encodeURIComponent(input.teamId)}/teamfolders`,
      { "filter[type]": input.type, "page[limit]": input.limit, "page[offset]": input.offset },
    );
    return listResult(body);
  },
};

export default teamFolderList;
