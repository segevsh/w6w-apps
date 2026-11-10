import type { ActionDefinition } from "@w6w/types";
import projectLabelList from "../actions/project-label-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

// `GET /v2/projects/{id}/labels` for the project the user picks; a project carries a handful of
// labels, snapshotted each check (brief 9.1c).
export default snapshotTrigger<{ projectId: string }>({
  key: "new-project-label",
  title: "New Project Label",
  description: "The run gets each label newly applied to one project.",
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "The project to watch (its ID is in the project URL or a List Projects result).",
    },
  ],
  action: projectLabelList as unknown as ActionDefinition,
  input: (p) => ({ projectId: p.projectId }),
  output: [
    { key: "id", type: "string", label: "Tag ID" },
    { key: "display_value", type: "string", label: "Display value" },
    { key: "value", type: "string", label: "Value" },
    { key: "created_at", type: "number", label: "Created (Unix seconds)" },
  ],
  sample: {
    id: "2001",
    display_value: "Roof",
    value: "roof",
    created_at: 1762646400,
    updated_at: 1762646400,
  },
});
