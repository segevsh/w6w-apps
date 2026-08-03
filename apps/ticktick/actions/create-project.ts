import type { ActionDefinition } from "@w6w/types";
import { compact, TickTickClient } from "../lib/client.ts";
import { projectFieldParams, projectOutput } from "../lib/params.ts";

interface Input {
  name: string;
  color?: string;
  sortOrder?: number;
  viewMode?: string;
  kind?: string;
}

/**
 * `POST /open/v1/project` — create a project (list).
 *
 * `name` is the only required field. Everything else is optional and TickTick
 * supplies its own defaults, so nothing is invented here: a call with just a
 * name sends a one-field body.
 *
 * There is no way to create a project *group* (the folder a project's `groupId`
 * points at) through the Open API, so a new project is always top-level.
 *
 * TickTick mints a fresh id per call and has no idempotency key, so a retry
 * creates a second project with the same name — `idempotent: false`.
 */
const createProject: ActionDefinition<Input> = {
  key: "create-project",
  type: "perform",
  resource: "project",
  title: "Create Project",
  description: "Create a TickTick project (list). Only the name is required.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    ...projectFieldParams(),
  ],
  output: projectOutput(),

  execute(input, ctx) {
    const client = new TickTickClient(ctx);
    return client.request("/project", {
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

export default createProject;
