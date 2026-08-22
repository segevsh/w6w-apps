import type { ActionDefinition } from "@w6w/types";
import { DeepgramClient } from "../lib/client.ts";

/**
 * `GET /v1/projects` — the projects this key can reach.
 *
 * A Deepgram key belongs to a project, and a project is the unit of billing,
 * keys, members and usage. The connection records the project at connect time
 * so no other action asks for it — this exists to confirm *which*, which is the
 * first thing to check when a usage figure looks wrong.
 *
 * It is also the cheapest authenticated call in the API, which is why the
 * connection test uses it.
 */
const action: ActionDefinition = {
  key: "project-list",
  type: "read",
  resource: "project",
  title: "List projects",
  description:
    "The projects this key reaches — the unit of billing, keys, members and usage. Usually one, " +
    "and the first thing to check when a usage figure looks wrong.",
  params: [],
  output: [
    { key: "projects", type: "array", label: "Projects" },
    { key: "count", type: "number", label: "Projects reachable" },
  ],

  async execute(_input, ctx) {
    const body = await new DeepgramClient(ctx).request<{ projects?: unknown[] }>("/v1/projects");
    const projects = body?.projects ?? [];
    return { projects, count: projects.length };
  },
};

export default action;
