import { listAction, projectIdParam, projectPath } from "../lib/actions.ts";

export default listAction({
  key: "list-screens",
  resource: "screen",
  title: "List Screens",
  description: "List the screens of a project (GET /v1/projects/{project_id}/screens).",
  params: [
    projectIdParam,
    {
      key: "sectionId",
      label: "Section ID",
      type: "string",
      hint: "Only screens in this section.",
    },
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      options: [
        { value: "created", label: "Created (default)" },
        { value: "section", label: "Section" },
      ],
    },
  ],
  path: (i) => `${projectPath(i)}/screens`,
  query: (i) => ({
    section_id: String(i.sectionId ?? "").trim() || undefined,
    sort: String(i.sort ?? "").trim() || undefined,
  }),
});
