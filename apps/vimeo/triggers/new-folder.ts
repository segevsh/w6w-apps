import { pollFromListAction } from "../../_shared/poll/mod.ts";
import folderList from "../actions/folder-list.ts";

/**
 * `GET /me/projects` takes `sort=date` and `direction=desc` (newest first), per the Folders reference
 * https://developer.vimeo.com/api/reference/folders (2026-11-10), so page 1 is the newest folders.
 */
export default pollFromListAction({
  key: "new-folder",
  title: "New Folder",
  description: "The run gets each newly created folder.",
  action: folderList as never,
  input: () => ({ sort: "date", direction: "desc", page: 1, perPage: 100 }),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (i) => String((i as { uri?: unknown }).uri ?? ""),
  output: [
    { key: "uri", type: "string", label: "Folder URI" },
    { key: "name", type: "string", label: "Name" },
    { key: "created_time", type: "string", label: "Created" },
    { key: "modified_time", type: "string", label: "Modified" },
  ],
  sample: {
    uri: "/users/1/projects/12345",
    name: "Launch assets",
    created_time: "2026-11-09T12:00:00+00:00",
    modified_time: "2026-11-09T12:00:00+00:00",
  },
  maxPages: 1,
});
