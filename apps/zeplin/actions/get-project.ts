import { getAction, projectIdParam, projectPath } from "../lib/actions.ts";

export default getAction({
  key: "get-project",
  resource: "project",
  title: "Get Project",
  description: "Get a project by id (GET /v1/projects/{project_id}).",
  params: [projectIdParam],
  path: projectPath,
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "platform", type: "string", label: "Platform" },
    { key: "status", type: "string", label: "Status (active or archived)" },
    { key: "thumbnail", type: "string", label: "Thumbnail URL" },
    { key: "scene_url", type: "string", label: "Scene URL" },
    { key: "created", type: "number", label: "Created (UNIX seconds)" },
    { key: "updated", type: "number", label: "Updated (UNIX seconds)" },
    { key: "number_of_screens", type: "number", label: "Screens" },
    { key: "number_of_components", type: "number", label: "Components" },
    { key: "number_of_colors", type: "number", label: "Colors" },
    { key: "number_of_members", type: "number", label: "Members" },
    { key: "linked_styleguide", type: "object", label: "Linked styleguide ({ id })" },
    { key: "organization", type: "object", label: "Owning organization" },
    { key: "workflow_status", type: "object", label: "Workflow status" },
  ],
});
