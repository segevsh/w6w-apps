import type { ActionDefinition } from "@w6w/types";
import { projectPath, TickTickClient } from "../lib/client.ts";
import { acceptedOutput, projectParam } from "../lib/params.ts";

/**
 * `DELETE /open/v1/project/{projectId}` — delete a project.
 *
 * Documented as `200 OK` with schema **No Content**, so this routes through
 * `status()` rather than `request()`: an empty body is not valid JSON and
 * parsing it would throw on a call that actually succeeded.
 *
 * **This takes the project's tasks with it**, and TickTick documents no way to
 * undo it through the API — there is no archive endpoint and no trash endpoint.
 * (`closed: true` is what an archived project reports, but nothing in the Open
 * API sets it; archiving is a client-side feature.) Treat this as destructive.
 *
 * Idempotent in the sense that matters for retries: deleting a project twice
 * leaves the same world, the second call answering `404`.
 */
const deleteProject: ActionDefinition<{ projectId: string }, { status: number }> = {
  key: "delete-project",
  type: "perform",
  resource: "project",
  title: "Delete Project",
  description:
    "Delete a project and everything in it. Destructive and not undoable through the API — TickTick exposes no archive or trash endpoint.",
  idempotent: true,
  params: [projectParam],
  output: acceptedOutput(),

  execute(input, ctx) {
    const client = new TickTickClient(ctx);
    return client.status(projectPath(input.projectId), { method: "DELETE" });
  },
};

export default deleteProject;
