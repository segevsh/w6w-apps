import { listAction, projectIdParam, projectPath } from "../lib/actions.ts";

export default listAction({
  key: "list-screen-sections",
  resource: "screen_section",
  title: "List Screen Sections",
  description:
    "List the screen sections of a project (GET /v1/projects/{project_id}/screen_sections).",
  params: [projectIdParam],
  path: (i) => `${projectPath(i)}/screen_sections`,
});
