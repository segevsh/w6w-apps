import type { ActionDefinition } from "@w6w/types";
import projectList from "../actions/project-list.ts";
import { boundedListSnapshot } from "../lib/triggers.ts";

export default boundedListSnapshot({
  key: "new-project",
  title: "New Project",
  description: "The run gets each project newly visible to the API key.",
  action: projectList as unknown as ActionDefinition,
  input: (params) => params,
  output: [{ key: "id", type: "string", label: "Project ID" }],
  sample: { id: "project-101", name: "Help centre" },
});
