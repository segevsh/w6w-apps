import { snapshotFeed } from "../lib/triggers.ts";
import projectList from "../actions/project-list.ts";

type Item = Record<string, unknown>;

/** `GET /v1/projects` — every project the key reaches, unpaginated (usually one). */
export default snapshotFeed({
  key: "new-project",
  title: "New Project",
  description: "The run gets each Deepgram project the API key newly reaches.",
  action: projectList,
  items: (result) => (result as { projects?: Item[] }).projects ?? [],
  idOf: (item) => String(item.project_id ?? ""),
  output: [
    { key: "project_id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Project name" },
  ],
  sample: { project_id: "project-sample-1", name: "Production" },
});
