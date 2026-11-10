import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/template-folder-list.ts";

export default pollFromListAction<{ parentId: string }>({
  key: "new-template-folder",
  title: "New Template Folder",
  description: "The run gets each newly created Superchat template folder below a selected parent.",
  action: action as unknown as ActionDefinition,
  input: (params) => ({ parentId: params.parentId, limit: 100 }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [{ key: "parentId", label: "Parent folder ID", type: "string", required: true }],
  output: [{ key: "id", type: "string", label: "Template folder ID" }],
  sample: { id: "folder_1" },
  maxPages: 1,
});
