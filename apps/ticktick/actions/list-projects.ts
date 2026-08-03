import type { ActionDefinition } from "@w6w/types";
import { TickTickClient } from "../lib/client.ts";
import { arrayOutput } from "../lib/params.ts";

/**
 * `GET /open/v1/project` — every project (list) the user can see.
 *
 * The only parameterless read in the API, and the entry point to everything
 * else: a task is only ever addressable through its project, so this is where a
 * workflow starts.
 *
 * It returns a **bare JSON array** — no envelope, no cursor, no `total`. There
 * is no paging in this API and no way to ask for a subset, so the whole
 * collection comes back every time. That is fine at TickTick's scale (a user's
 * project count is a UI sidebar, not a dataset) but it is worth knowing that the
 * cost is not tunable.
 *
 * `closed: true` marks an archived project. TickTick returns those too, and
 * offers no filter, so they are passed through rather than silently dropped —
 * an action that hid rows the API returned would be lying about the account.
 */
const listProjects: ActionDefinition<Record<string, never>, { items: unknown[]; count: number }> = {
  key: "list-projects",
  type: "search",
  resource: "project",
  title: "List Projects",
  description:
    "List every TickTick project (what the apps call a List). Takes no parameters and returns all of them — the API has no paging and no filter.",
  params: [],
  output: arrayOutput("Projects"),

  async execute(_input, ctx) {
    const client = new TickTickClient(ctx);
    const items = await client.list("/project");
    return { items, count: items.length };
  },
};

export default listProjects;
