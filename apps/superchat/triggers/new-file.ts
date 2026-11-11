import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/file-list.ts";

export default pollFromListAction<Record<string, never>>({
  key: "new-file",
  title: "New File",
  description: "The run gets each newly uploaded Superchat file.",
  action: action as unknown as ActionDefinition,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "File ID" }],
  sample: { id: "file_1" },
  maxPages: 1,
});
