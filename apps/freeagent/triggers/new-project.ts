import { newestFirstTrigger } from "../lib/triggers.ts";
import projectList from "../actions/project-list.ts";

export default newestFirstTrigger({
  key: "new-project",
  title: "New Project",
  description: "The run gets each newly created FreeAgent project (newest first).",
  action: projectList,
  itemsKey: "projects",
  sort: "-created_at",
  paged: true,
  output: [
    { key: "url", type: "string", label: "Project URL (its ID)" },
    { key: "name", type: "string", label: "Name" },
    { key: "contact", type: "string", label: "Contact URL" },
    { key: "status", type: "string", label: "Status" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "created_at", type: "string", label: "Created" },
    { key: "updated_at", type: "string", label: "Updated" },
  ],
  sample: {
    url: "https://api.freeagent.com/v2/projects/1",
    name: "Website build",
    contact: "https://api.freeagent.com/v2/contacts/1",
    status: "Active",
    currency: "GBP",
    created_at: "2026-11-09T10:00:00Z",
    updated_at: "2026-11-09T10:00:00Z",
  },
});
