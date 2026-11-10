import { boundedList } from "../lib/triggers.ts";
import labelList from "../actions/label-list.ts";

export default boundedList({
  key: "new-label",
  title: "New Label",
  description: "The run gets each label newly created in one project.",
  action: labelList as never,
  params: [{
    key: "projectId",
    label: "Project ID",
    type: "number",
    required: true,
    hint: "The project to watch (the id in the project's URL or from List Projects).",
  }],
  input: (p) => ({ projectId: Number(p.projectId) }),
  output: [{ key: "id", type: "number", label: "Label ID" }, {
    key: "name",
    type: "string",
    label: "Name",
  }, { key: "color", type: "string", label: "Colour" }],
  sample: { id: 21, name: "Urgent", color: "d93651" },
});
