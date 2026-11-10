import { pollFromListAction } from "../../_shared/poll/mod.ts";
import projectList from "../actions/project-list.ts";

export default pollFromListAction<{ organizationId: number }>({
  key: "new-project",
  title: "New Project",
  description: "The run gets each new project.",
  action: projectList as never,
  input: (params: { organizationId: number }) => ({
    organization_id: params.organizationId,
    status: "all",
    page_limit: 100,
  }),
  params: [{ key: "organizationId", label: "Organization ID", type: "number", required: true }],
  items: (result) => (result as { projects?: unknown[] }).projects ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Project ID" }],
  sample: { id: 1, name: "Website" },
  maxPages: 1,
});
