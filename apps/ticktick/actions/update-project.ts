import type { ActionDefinition } from "@w6w/types";
import { compact, projectPath, TickTickClient } from "../lib/client.ts";
import { projectFieldParams, projectOutput, projectParam } from "../lib/params.ts";

interface Input {
  projectId: string;
  name?: string;
  color?: string;
  sortOrder?: number;
  viewMode?: string;
  kind?: string;
}

/**
 * `POST /open/v1/project/{projectId}` — update a project.
 *
 * `POST`, not `PUT` or `PATCH`. TickTick has no other update verb.
 *
 * **An honest uncertainty, stated rather than guessed at.** TickTick does not
 * document whether this endpoint merges the body into the existing project or
 * replaces it — its example sends every field, which is consistent with either
 * reading. This action sends **only what the caller set** (`compact()`), which
 * is the safe direction if the semantics are merge and the recoverable direction
 * if they are replace. If you need certainty, read the project first and pass
 * every field back.
 *
 * Idempotent: the same body applied twice leaves the same project.
 */
const updateProject: ActionDefinition<Input> = {
  key: "update-project",
  type: "perform",
  resource: "project",
  title: "Update Project",
  description:
    "Update a project's name, colour, view mode or kind. Sends only the fields you set; TickTick does not document whether the update merges or replaces.",
  idempotent: true,
  params: [
    projectParam,
    { key: "name", label: "Name", type: "string" },
    ...projectFieldParams(),
  ],
  output: projectOutput(),

  execute(input, ctx) {
    const client = new TickTickClient(ctx);
    return client.request(projectPath(input.projectId), {
      method: "POST",
      body: compact({
        name: input.name,
        color: input.color,
        sortOrder: input.sortOrder,
        viewMode: input.viewMode,
        kind: input.kind,
      }),
    });
  },
};

export default updateProject;
