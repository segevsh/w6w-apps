import { pollFromListAction } from "../../_shared/poll/mod.ts";
import driveSearch from "../actions/drive-search.ts";

export default pollFromListAction({
  key: "new-drive-file",
  title: "New Drive File",
  description: "The run gets each newly indexed Drive file.",
  action: driveSearch as never,
  params: driveSearch.params,
  input: (params) => ({
    searchKeyword: String(params.searchKeyword ?? ""),
    projectId: params.projectId as string | undefined,
    page: 1,
    pageSize: 100,
  }),
  items: (result) =>
    (result as { items?: unknown[]; data?: unknown[] }).items ??
      (result as { data?: unknown[] }).data ?? [],
  idOf: (item) =>
    String(
      (item as { id?: unknown; file_id?: unknown }).id ?? (item as { file_id?: unknown }).file_id ??
        "",
    ),
  output: [{ key: "id", type: "string", label: "Drive file ID" }],
  sample: { id: "file-1" },
  maxPages: 1,
});
