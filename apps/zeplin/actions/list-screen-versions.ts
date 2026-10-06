import { listAction, projectIdParam, screenIdParam, screenPath } from "../lib/actions.ts";

export default listAction({
  key: "list-screen-versions",
  resource: "screen_version",
  title: "List Screen Versions",
  description:
    "List the versions of a screen (GET /v1/projects/{project_id}/screens/{screen_id}/versions).",
  params: [projectIdParam, screenIdParam],
  path: (i) => `${screenPath(i)}/versions`,
});
