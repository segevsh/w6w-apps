import type { ActionDefinition } from "@w6w/types";
import { projectPath, TickTickClient } from "../lib/client.ts";
import { projectOutput, projectParam } from "../lib/params.ts";

/**
 * `GET /open/v1/project/{projectId}` — one project's metadata.
 *
 * Note what it does *not* include: the project's tasks. For those, use **Get
 * Project With Data**, which is the same read plus `tasks` and `columns` in one
 * round trip.
 *
 * One documented discrepancy, passed through rather than smoothed over: the
 * array form (`GET /project`) includes a `permission` field (`read` / `write` /
 * `comment`) and this single-project response example does not, even though both
 * are typed as the same `Project`. TickTick does not explain the difference, so
 * neither does this action — the `permission` output field is declared and will
 * simply be absent when TickTick omits it.
 */
const getProject: ActionDefinition<{ projectId: string }> = {
  key: "get-project",
  type: "read",
  resource: "project",
  title: "Get Project",
  description: "Fetch one project's metadata by id. Does not include its tasks.",
  params: [projectParam],
  output: projectOutput(),

  execute(input, ctx) {
    const client = new TickTickClient(ctx);
    return client.request(projectPath(input.projectId));
  },
};

export default getProject;
