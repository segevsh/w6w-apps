import { pollFromListAction } from "../../_shared/poll/mod.ts";
import projectList from "../actions/project-list.ts";

export default pollFromListAction({
  key: "new-project",
  title: "New Project",
  description: "Fires when a new HoneyBook project is created.",
  action: projectList,
  input: () => ({ page: 1, perPage: 100, sort: "-created_at" }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id: unknown }).id),
  output: [{ key: "id", type: "string", label: "Project ID" }],
  sample: { id: "project_123" },
});
