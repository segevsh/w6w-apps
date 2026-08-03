import type { ActionDefinition, OutputField } from "@w6w/types";
import { projectPath, TickTickClient } from "../lib/client.ts";
import { projectParam } from "../lib/params.ts";

/**
 * `GET /open/v1/project/{projectId}/data` — the project, its tasks and its
 * kanban columns in one call.
 *
 * **This is the only way to enumerate the tasks in a project.** There is no
 * `GET /project/{id}/task` collection endpoint; `GET /project/{p}/task/{t}`
 * needs an id you do not have yet. So the read pattern for "what is in this
 * list" is this action, and the `tasks` array it returns is where task ids come
 * from.
 *
 * The one constraint that matters, and it is stated in TickTick's own
 * definition table rather than in the endpoint description: `tasks` is
 * **"Undone tasks under project"** — completed tasks are not in it. Getting
 * those is a different endpoint (**List Completed Tasks**), which is why this
 * App ships both.
 *
 * `columns` is the kanban board's column list. It is returned for every project,
 * including `viewMode: "list"` ones, where it is simply unused.
 */
const output: OutputField[] = [
  { key: "project", type: "object", label: "Project" },
  { key: "tasks", type: "array", label: "Undone tasks" },
  { key: "columns", type: "array", label: "Kanban columns" },
];

const getProjectData: ActionDefinition<{ projectId: string }> = {
  key: "get-project-data",
  type: "read",
  resource: "project",
  title: "Get Project With Data",
  description:
    "Fetch a project together with its undone tasks and its kanban columns. This is the only way to enumerate a project's tasks — completed ones are excluded, use List Completed Tasks for those.",
  params: [projectParam],
  output,

  execute(input, ctx) {
    const client = new TickTickClient(ctx);
    return client.request(`${projectPath(input.projectId)}/data`);
  },
};

export default getProjectData;
