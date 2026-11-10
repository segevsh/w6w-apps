import projectList from "../actions/project-list.ts";
import { snapshotTrigger } from "../lib/depth.ts";

// GET /projects has no created-at sort (only name, updated_at and space; verified 2026-11-10), and an
// account holds a modest number of projects, so each check reads the list and diffs the ids.
export default snapshotTrigger<Record<string, unknown>>({
  key: "new-project",
  title: "New Project",
  description: "The run gets each project that newly becomes visible to the token.",
  action: projectList as never,
  input: () => ({}),
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "main_format", type: "string", label: "Main format" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "project-sample-1",
    name: "Web app",
    main_format: "json",
    created_at: "2026-11-10T09:00:00Z",
  },
});
