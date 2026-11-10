import { pollFromListAction } from "../../_shared/poll/mod.ts";
import folderItemList from "../actions/folder-item-list.ts";

/**
 * `GET /me/projects/{folder}/items` takes `sort=date` and `direction=desc`, per
 * https://developer.vimeo.com/api/reference/folders (2026-11-10). Each item wraps the
 * record under its own `type` key (`video`, `folder`, `live_event`), whose `uri` is the id.
 */
export default pollFromListAction({
  key: "new-folder-item",
  title: "New Folder Item",
  description: "The run gets each newly created video, subfolder or live event in the folder.",
  action: folderItemList as never,
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
  idOf: (i) => {
    const x = i as Record<string, { uri?: unknown } | undefined>;
    const t = String((i as { type?: unknown }).type ?? "");
    return String(x[t]?.uri ?? x.video?.uri ?? x.folder?.uri ?? x.live_event?.uri ?? "");
  },
  output: [
    { key: "type", type: "string", label: "Item type (video, folder, live event)" },
    { key: "video", type: "object", label: "Video, when the item is one" },
    { key: "folder", type: "object", label: "Subfolder, when the item is one" },
  ],
  sample: { type: "video", video: { uri: "/videos/258684937", name: "Launch day" } },
  maxPages: 1,
});
