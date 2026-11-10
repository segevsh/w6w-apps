import { newestFirst } from "../lib/triggers.ts";
import projectList from "../actions/project-list.ts";

export default newestFirst({
  key: "new-project",
  title: "New Project",
  description: "The run gets each project newly created in the account.",
  action: projectList as never,
  params: [],
  input: () => ({ status: "all" }),
  idOf: (item) => String(item.id ?? ""),
  output: [{ key: "id", type: "number", label: "Project ID" }, {
    key: "name",
    type: "string",
    label: "Name",
  }, { key: "status", type: "number", label: "Status" }],
  sample: { id: 1, name: "Website relaunch", status: 1 },
});
