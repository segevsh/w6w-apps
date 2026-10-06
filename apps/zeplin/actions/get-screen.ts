import { getAction, projectIdParam, screenIdParam, screenPath } from "../lib/actions.ts";

export default getAction({
  key: "get-screen",
  resource: "screen",
  title: "Get Screen",
  description: "Get a screen by id (GET /v1/projects/{project_id}/screens/{screen_id}).",
  params: [projectIdParam, screenIdParam],
  path: screenPath,
  output: [
    { key: "id", type: "string", label: "Screen ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "tags", type: "array", label: "Tags" },
    { key: "image", type: "object", label: "Snapshot image (original_url, width, height, ...)" },
    { key: "created", type: "number", label: "Created (UNIX seconds)" },
    { key: "updated", type: "number", label: "Updated (UNIX seconds)" },
    { key: "number_of_notes", type: "number", label: "Notes" },
    { key: "number_of_versions", type: "number", label: "Versions" },
    { key: "section", type: "object", label: "Section ({ id })" },
    { key: "variant", type: "object", label: "Variant" },
  ],
});
