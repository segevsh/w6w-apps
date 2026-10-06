import { flagParam, listAction, projectIdParam, projectPath } from "../lib/actions.ts";

export default listAction({
  key: "list-project-components",
  resource: "component",
  title: "List Project Components",
  description: "List the components of a project (GET /v1/projects/{project_id}/components).",
  params: [
    projectIdParam,
    {
      key: "sectionId",
      label: "Section ID",
      type: "string",
      hint: "Only components in this section.",
    },
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      options: [
        { value: "section", label: "Section (default)" },
        { value: "created", label: "Created" },
      ],
    },
    flagParam(
      "includeLatestVersion",
      "Include latest version",
      "Embed each component's latest version.",
    ),
    flagParam(
      "includeLinkedStyleguides",
      "Include linked styleguides",
      "Also list components from linked styleguides.",
    ),
  ],
  path: (i) => `${projectPath(i)}/components`,
  query: (i) => ({
    section_id: String(i.sectionId ?? "").trim() || undefined,
    sort: String(i.sort ?? "").trim() || undefined,
    include_latest_version: i.includeLatestVersion ? true : undefined,
    include_linked_styleguides: i.includeLinkedStyleguides ? true : undefined,
  }),
});
