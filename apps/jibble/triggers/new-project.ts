import type { ActionDefinition } from "@w6w/types";
import { odataFeed } from "../lib/triggers.ts";
import projectList from "../actions/project-list.ts";

/** OData `$orderby` newest-first; `createdAt`/`updatedAt` are on the entity ($metadata, verified 2026-11-10). */
export default odataFeed({
  key: "new-project",
  title: "New Project",
  description: "The run gets each newly created project: id, name, code, status and timestamps.",
  action: projectList as ActionDefinition,
  orderBy: "createdAt desc",
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "project-1",
    name: "Website redesign",
    code: "WEB",
    status: "Active",
    createdAt: "2026-11-09T09:00:00Z",
    updatedAt: "2026-11-09T09:00:00Z",
  },
});
