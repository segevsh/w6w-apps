import { listAction, projectIdParam, screenIdParam, screenPath } from "../lib/actions.ts";

export default listAction({
  key: "list-screen-notes",
  resource: "note",
  title: "List Screen Notes",
  description:
    "List the notes (with their comments) on a screen (GET /v1/projects/{project_id}/screens/{screen_id}/notes).",
  params: [projectIdParam, screenIdParam],
  path: (i) => `${screenPath(i)}/notes`,
});
