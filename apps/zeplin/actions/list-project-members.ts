import { listAction, projectIdParam, projectPath } from "../lib/actions.ts";

export default listAction({
  key: "list-project-members",
  resource: "member",
  title: "List Project Members",
  description: "List the members of a project (GET /v1/projects/{project_id}/members).",
  params: [projectIdParam],
  path: (i) => `${projectPath(i)}/members`,
});
