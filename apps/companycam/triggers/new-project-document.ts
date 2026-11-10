import type { ActionDefinition } from "@w6w/types";
import projectDocumentList from "../actions/project-document-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

// `GET /v2/projects/{id}/documents` for the project the user picks; one project's documents are a
// bounded collection, snapshotted each check (brief 9.1c).
export default snapshotTrigger<{ projectId: string }>({
  key: "new-project-document",
  title: "New Project Document",
  description: "The run gets each document newly added to one project.",
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "The project to watch (its ID is in the project URL or a List Projects result).",
    },
  ],
  action: projectDocumentList as unknown as ActionDefinition,
  input: (p) => ({ projectId: p.projectId }),
  output: [
    { key: "id", type: "string", label: "Document ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "url", type: "string", label: "URL" },
    { key: "content_type", type: "string", label: "Content type" },
    { key: "project_id", type: "string", label: "Project ID" },
    { key: "created_at", type: "number", label: "Created (Unix seconds)" },
  ],
  sample: {
    id: "6001",
    name: "Permit.pdf",
    url: "https://example.com/permit.pdf",
    content_type: "application/pdf",
    project_id: "5001",
    created_at: 1762646400,
  },
});
