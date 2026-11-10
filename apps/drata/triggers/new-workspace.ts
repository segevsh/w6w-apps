import { pollFromListAction } from "../../_shared/poll/mod.ts";
import workspaceList from "../actions/workspace-list.ts";

export default pollFromListAction({
  key: "new-workspace",
  title: "New Workspace",
  description: "The run gets each new workspace.",
  action: workspaceList,
  input: () => ({ size: 100, sort: "createdAt", sortDir: "DESC" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Workspace ID" }],
  sample: { id: 1 },
  maxPages: 1,
});
