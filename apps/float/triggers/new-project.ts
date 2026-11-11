import { newestFirstTrigger } from "../lib/triggers.ts";
import projectList from "../actions/project-list.ts";

export default newestFirstTrigger({
  key: "new-project",
  title: "New Project",
  description: "The run gets each newly created Float project record (newest first).",
  action: projectList,
  sort: "-created",
  idKey: "project_id",
  output: [
    { key: "project_id", type: "number", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "client_id", type: "number", label: "Client ID" },
    { key: "status", type: "number", label: "Status (0 draft .. 4 canceled)" },
    { key: "active", type: "number", label: "1 if active" },
    { key: "created", type: "string", label: "Created at" },
    { key: "modified", type: "string", label: "Last modified at" },
  ],
  sample: {
    project_id: 301,
    name: "Website redesign",
    client_id: 401,
    status: 2,
    active: 1,
    created: "2026-11-09 12:00:00",
    modified: "2026-11-09 12:00:00",
  },
});
