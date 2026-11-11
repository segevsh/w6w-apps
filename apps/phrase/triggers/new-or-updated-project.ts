import projectList from "../actions/project-list.ts";
import { sortedTrigger } from "../lib/depth.ts";

// GET /projects takes `sort_by=updated_at_desc`
// (https://developers.phrase.com/en/api/strings/projects/list-projects, verified 2026-11-10); a new
// project is also an updated one, and the id carries `updated_at` so an edit is a new event.
export default sortedTrigger<Record<string, unknown>>({
  key: "new-or-updated-project",
  title: "New or Updated Project",
  description: "The run gets each project that was created or edited.",
  action: projectList as never,
  sort: { sortBy: "updated_at_desc" },
  stamp: "updated_at",
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "main_format", type: "string", label: "Main format" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "project-sample-1",
    name: "Web app",
    main_format: "json",
    updated_at: "2026-11-10T09:30:00Z",
  },
});
