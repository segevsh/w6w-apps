import { newestFirst } from "../lib/triggers.ts";
import sectionList from "../actions/section-list.ts";

export default newestFirst({
  key: "new-section",
  title: "New Section",
  description: "The run gets each section newly added to one project.",
  action: sectionList as never,
  params: [{
    key: "projectId",
    label: "Project ID",
    type: "number",
    required: true,
    hint: "The project to watch (the id in the project's URL or from List Projects).",
  }],
  input: (p) => ({ projectId: Number(p.projectId), status: "all" }),
  idOf: (item) => String(item.id ?? ""),
  output: [{ key: "id", type: "number", label: "Section ID" }, {
    key: "name",
    type: "string",
    label: "Name",
  }, { key: "project_id", type: "number", label: "Project ID" }],
  sample: { id: 11, name: "To Do", project_id: 1 },
});
