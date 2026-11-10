import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listFiles from "../actions/list-files.ts";

export default pollFromListAction({
  key: "new-file",
  title: "New File",
  description: "The run gets each newly created file.",
  action: listFiles,
  input: () => ({ limit: 100, order: "desc", sortBy: "created_at" }),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (i) => String((i as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "File ID" }],
  sample: { id: "sample-id" },
  maxPages: 1,
});
