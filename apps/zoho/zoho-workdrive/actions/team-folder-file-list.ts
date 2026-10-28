import type { ActionDefinition } from "@w6w/types";
import { listResult, pageQuery, WorkDriveClient } from "../lib/client.ts";
import { listOutput, pagingParams } from "../lib/params.ts";

interface Input {
  teamFolderId: string;
  limit?: number;
  offset?: number;
  next?: string;
  filterType?: string;
}

/** `GET /teamfolders/{teamfolder_id}/files` — offset (`page[offset]`) or cursor (`page[next]`). */
const teamFolderFileList: ActionDefinition<Input> = {
  key: "team-folder-file-list",
  type: "read",
  resource: "file",
  title: "List Team Folder Contents",
  description: "List the files and folders at the top level of a team folder.",
  params: [
    { key: "teamFolderId", label: "Team Folder ID", type: "string", required: true },
    ...pagingParams,
  ],
  output: [...listOutput],

  async execute(input, ctx) {
    const body = await new WorkDriveClient(ctx).get(
      `/teamfolders/${encodeURIComponent(input.teamFolderId)}/files`,
      pageQuery(input),
    );
    return listResult(body);
  },
};

export default teamFolderFileList;
