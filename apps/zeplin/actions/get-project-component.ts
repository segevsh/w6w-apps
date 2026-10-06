import { flagParam, getAction, projectIdParam, projectPath } from "../lib/actions.ts";
import { pathId } from "../lib/client.ts";

export default getAction({
  key: "get-project-component",
  resource: "component",
  title: "Get Project Component",
  description:
    "Get a component of a project (GET /v1/projects/{project_id}/components/{component_id}).",
  params: [
    projectIdParam,
    { key: "componentId", label: "Component ID", type: "string", required: true },
    flagParam(
      "includeLatestVersion",
      "Include latest version",
      "Embed the component's latest version.",
    ),
    flagParam(
      "includeLinkedStyleguides",
      "Include linked styleguides",
      "Also search linked styleguides.",
    ),
  ],
  path: (i) => `${projectPath(i)}/components/${pathId(i.componentId, "Component ID")}`,
  query: (i) => ({
    include_latest_version: i.includeLatestVersion ? true : undefined,
    include_linked_styleguides: i.includeLinkedStyleguides ? true : undefined,
  }),
  output: [
    { key: "id", type: "string", label: "Component ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "image", type: "object", label: "Snapshot image" },
    { key: "created", type: "number", label: "Created (UNIX seconds)" },
    { key: "updated", type: "number", label: "Updated (UNIX seconds)" },
    { key: "section", type: "object", label: "Section" },
    { key: "source", type: "object", label: "Source" },
    { key: "variant_properties", type: "array", label: "Variant properties" },
    { key: "latest_version", type: "object", label: "Latest version (when requested)" },
  ],
});
