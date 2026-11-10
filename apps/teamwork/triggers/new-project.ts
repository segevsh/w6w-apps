import { pollFromListAction } from "../../_shared/poll/mod.ts";
import projectList from "../actions/project-list.ts";

export default pollFromListAction({
  key: "new-project",
  title: "New Project",
  description: "Poll newest projects through the existing project-list action.",
  action: projectList,
  input: () => ({ orderBy: "datecreated", orderMode: "desc", page: 1, pageSize: 100 }),
  items: (result) => (result as { projects?: unknown[] }).projects ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Project ID" }],
  sample: { id: 101 },
  maxPages: 1,
});
