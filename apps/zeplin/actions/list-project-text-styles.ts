import {
  includeLinkedParam,
  includeLinkedQuery,
  listAction,
  projectIdParam,
  projectPath,
} from "../lib/actions.ts";

export default listAction({
  key: "list-project-text-styles",
  resource: "text_style",
  title: "List Project Text Styles",
  description: "List the text styles of a project (GET /v1/projects/{project_id}/text_styles).",
  params: [projectIdParam, includeLinkedParam],
  path: (i) => `${projectPath(i)}/text_styles`,
  query: includeLinkedQuery,
});
