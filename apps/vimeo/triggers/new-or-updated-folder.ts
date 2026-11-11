import { pollFromListAction } from "../../_shared/poll/mod.ts";
import folderList from "../actions/folder-list.ts";

/**
 * `GET /me/projects` takes `sort=modified_time` and `direction=desc` (most recently modified first), per
 * https://developer.vimeo.com/api/reference/folders (2026-11-10). The event id carries the
 * `modified_time`, so an edit is a new event.
 */
export default pollFromListAction({
  key: "new-or-updated-folder",
  title: "New or Updated Folder",
  description: "The run gets each folder that is created or modified.",
  action: folderList as never,
  input: () => ({ sort: "modified_time", direction: "desc", page: 1, perPage: 100 }),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (i) =>
    `${(i as { uri?: unknown }).uri ?? ""}:${
      (i as { modified_time?: unknown }).modified_time ?? ""
    }`,
  output: [
    { key: "uri", type: "string", label: "Folder URI" },
    { key: "name", type: "string", label: "Name" },
    { key: "created_time", type: "string", label: "Created" },
    { key: "modified_time", type: "string", label: "Modified" },
  ],
  sample: {
    uri: "/users/1/projects/12345",
    name: "Launch assets",
    created_time: "2026-11-01T12:00:00+00:00",
    modified_time: "2026-11-09T12:00:00+00:00",
  },
  maxPages: 1,
});
