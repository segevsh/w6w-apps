import type { ActionDefinition } from "@w6w/types";
import { snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/template-folder-list.ts";

export default snapshotTrigger({
  key: "new-template-folder",
  title: "New Template Folder",
  description:
    "The run gets each newly created Superchat template folder, optionally only those below one parent folder.",
  action: action as unknown as ActionDefinition,
  input: (params) => ({ parentId: params.parentId }),
  params: [{
    key: "parentId",
    label: "Parent folder ID",
    type: "string",
    hint: "Leave empty to watch all folders.",
  }],
  output: [{ key: "id", type: "string", label: "Template folder ID" }],
  sample: { id: "folder_1" },
});
