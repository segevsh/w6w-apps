import type { TriggerDefinition } from "@w6w/types";
import teamFolderFileList from "../actions/team-folder-file-list.ts";
import { fileOutput, fileSample, pollFolderFiles } from "../lib/file-snapshot.ts";

// Zoho WorkDrive `GET /teamfolders/{teamfolder_id}/files` pages like every listing: offset with at
// most 50 per page (https://www.zoho.com/workdrive/developer/docs/api/v1/getting-started-pagination.html,
// checked 2026-11-10); no sort or created filter is documented for it (its own reference page could
// not be located), so each check reads the top level of the team folder by offset and diffs the ids
// (snapshot, brief 9.1 c). More than 1000 entries stops with an error rather than truncating.
const trigger: TriggerDefinition = {
  key: "new-team-folder-file",
  title: "New File in Team Folder",
  description: "The run gets each file or folder newly added at the top level of a team folder.",
  params: [
    { key: "teamFolderId", label: "Team Folder ID", type: "string", required: true },
  ],
  output: [...fileOutput],
  sample: fileSample,
  minIntervalMs: 300_000,
  poll: pollFolderFiles("new-team-folder-file", teamFolderFileList as never, "teamFolderId"),
};

export default trigger;
