import { pollFromListAction } from "../../_shared/poll/mod.ts";
import projectList from "../actions/project-list.ts";

export default pollFromListAction({
  key: "new-project",
  title: "New Project",
  description: "The run gets each newly created project.",
  action: projectList,
  input: () => ({}),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "dock", type: "array", label: "Tools (dock)" },
  ],
  sample: { id: 2085958499, name: "The Leto Laptop", status: "active", dock: [] },
  maxPages: 1,
});
