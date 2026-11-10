import type { TriggerDefinition } from "@w6w/types";
import fileList from "../actions/file-list.ts";
import { fileOutput, fileSample, pollFolderFiles } from "../lib/file-snapshot.ts";

// Zoho WorkDrive `GET /files/{folder_id}/files` documents offset paging of at most 50 per page and
// cursor paging, and the pagination page notes cursor listings do not keep folder-first order
// (https://www.zoho.com/workdrive/developer/docs/api/v1/getting-started-pagination.html, checked
// 2026-11-10); no sort or created filter is documented for the listing (its own reference page could
// not be located), so each check reads the whole folder by offset and diffs the ids (snapshot,
// brief 9.1 c). More than 1000 entries stops with an error rather than truncating.
const trigger: TriggerDefinition = {
  key: "new-file",
  title: "New File in Folder",
  description: "The run gets each file or sub-folder newly added to a WorkDrive folder.",
  params: [
    { key: "folderId", label: "Folder ID", type: "string", required: true },
  ],
  output: [...fileOutput],
  sample: fileSample,
  minIntervalMs: 300_000,
  poll: pollFolderFiles("new-file", fileList as never, "folderId"),
};

export default trigger;
