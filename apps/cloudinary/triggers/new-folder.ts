import folderList from "../actions/folder-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** `GET /folders[/{path}]` pages by `next_cursor` (max_results ≤ 500); one level per call, so the
 * parent folder is a param. https://cloudinary.com/documentation/admin_api#get_root_folders */
export default snapshotTrigger({
  key: "new-folder",
  title: "New Folder",
  description: "The run gets each folder newly created directly under the chosen parent folder.",
  action: folderList,
  params: (folderList.params ?? []).filter((p) => p.key === "path"),
  input: (params) => ({ path: params.path ?? "", returnAll: true }),
  items: (result) => (result as { folders?: unknown[] }).folders ?? [],
  keyOf: (item) => String((item as { path?: unknown }).path ?? ""),
  output: [
    { key: "name", type: "string", label: "Folder name" },
    { key: "path", type: "string", label: "Folder path" },
    { key: "external_id", type: "string", label: "External ID" },
  ],
  sample: { name: "products", path: "products", external_id: "sample-folder-id" },
});
