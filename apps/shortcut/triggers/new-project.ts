import type { ActionDefinition } from "@w6w/types";
import projectList from "../actions/project-list.ts";
import { snapshotTrigger } from "../lib/snapshots.ts";

/** `GET /api/v3/projects` answers every project as one array with no paging or order, so each check diffs the ids. */
export default snapshotTrigger({
  key: "new-project",
  title: "New Project",
  description: "The run gets each newly created project.",
  action: projectList as unknown as ActionDefinition,
  input: () => ({}),
  output: [
    { key: "id", type: "number", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: { id: 5, name: "Web app", created_at: "2026-11-10T09:00:00Z" },
});
