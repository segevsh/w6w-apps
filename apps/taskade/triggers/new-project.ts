import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/my-project-list.ts";

export default pollFromListAction({
  key: "new-project",
  title: "New Project",
  description: "The run gets each project newly available to the token owner.",
  action,
  input: () => ({ limit: 100, page: 1, sort: "viewed-desc" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Project ID" }],
  sample: { id: "project_101", name: "New project" },
  maxPages: 1,
});
