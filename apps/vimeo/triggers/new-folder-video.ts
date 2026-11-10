import { pollFromListAction } from "../../_shared/poll/mod.ts";
import folderVideoList from "../actions/folder-video-list.ts";

/**
 * `GET /me/projects/{folder}/videos` takes `sort=date` and `direction=desc`, per
 * https://developer.vimeo.com/api/reference/folders (2026-11-10). `date` is the video's
 * own date, so a video moved in from older uploads may sit below page 1.
 */
export default pollFromListAction({
  key: "new-folder-video",
  title: "New Folder Video",
  description: "The run gets each newly uploaded video in the folder.",
  action: folderVideoList as never,
  params: [{
    key: "folderId",
    label: "Folder ID",
    type: "string",
    required: true,
    placeholder: "12345",
    hint: "The numeric folder ID, or a full `/users/1/projects/12345` URI.",
  }],
  input: (p) => ({ folderId: p.folderId, sort: "date", direction: "desc", page: 1, perPage: 100 }),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (i) => String((i as { uri?: unknown }).uri ?? ""),
  output: [
    { key: "uri", type: "string", label: "URI" },
    { key: "name", type: "string", label: "Name" },
    { key: "link", type: "string", label: "Link" },
    { key: "created_time", type: "string", label: "Created" },
  ],
  sample: {
    uri: "/videos/258684937",
    name: "Launch day",
    link: "https://vimeo.com/258684937",
    created_time: "2026-11-09T12:00:00+00:00",
  },
  maxPages: 1,
});
