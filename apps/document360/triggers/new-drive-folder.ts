import type { ActionDefinition } from "@w6w/types";
import driveFolderList from "../actions/drive-folder-list.ts";
import { boundedListSnapshot } from "../lib/triggers.ts";

export default boundedListSnapshot({
  key: "new-drive-folder",
  title: "New Drive Folder",
  description: "The run gets each new Drive folder in the project you choose.",
  action: driveFolderList as unknown as ActionDefinition,
  params: driveFolderList.params,
  input: (params) => params,
  output: [{ key: "id", type: "string", label: "Drive folder ID" }],
  sample: { id: "folder-101", title: "Release notes" },
});
