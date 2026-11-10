import { pollFromListAction } from "../../_shared/poll/mod.ts";
import projectList from "../actions/project-list.ts";

export default pollFromListAction({
  key: "new-project",
  title: "New Project",
  description:
    "The run gets each newly created Mem project, polled from the existing `project-list` action with `order_by=created_at`.",
  action: projectList,
  input: () => ({ page: "", limit: 100, order_by: "created_at" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "proj-1",
    title: "Launch",
    status: "active",
    created_at: "2026-11-09T10:00:00Z",
    updated_at: "2026-11-09T10:00:00Z",
  },
  maxPages: 1,
});
