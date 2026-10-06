import {
  includeLinkedParam,
  includeLinkedQuery,
  listAction,
  projectIdParam,
  projectPath,
} from "../lib/actions.ts";

export default listAction({
  key: "list-project-colors",
  resource: "color",
  title: "List Project Colors",
  description: "List the colors of a project (GET /v1/projects/{project_id}/colors).",
  params: [projectIdParam, includeLinkedParam],
  path: (i) => `${projectPath(i)}/colors`,
  query: includeLinkedQuery,
});
