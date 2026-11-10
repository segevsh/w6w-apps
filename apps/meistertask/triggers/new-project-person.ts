import { boundedList } from "../lib/triggers.ts";
import projectPersonList from "../actions/project-person-list.ts";

export default boundedList({
  key: "new-project-person",
  title: "New Project Person",
  description: "The run gets each person newly added to one project.",
  action: projectPersonList as never,
  params: [{
    key: "projectId",
    label: "Project ID",
    type: "number",
    required: true,
    hint: "The project to watch (the id in the project's URL or from List Projects).",
  }],
  input: (p) => ({ projectId: Number(p.projectId) }),
  output: [
    { key: "id", type: "number", label: "Person ID" },
    { key: "firstname", type: "string", label: "First name" },
    { key: "lastname", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
  ],
  sample: { id: 7, firstname: "Ana", lastname: "Silva", email: "ana@example.com" },
});
