import type { ActionDefinition } from "@w6w/types";
import { LaunchDarklyClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /projects` — verified against LaunchDarkly's OpenAPI document
 * (`getProjects`).
 *
 * Where the project keys every other action needs come from — and the cheapest
 * call that proves a token works, which is why the connection test uses it too.
 */
const action: ActionDefinition = {
  key: "project-list",
  type: "read",
  resource: "project",
  title: "List projects",
  description: "List the projects this token can see.",
  params: [...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing LaunchDarkly projects", { returnAll, limit });

    return await new LaunchDarklyClient(ctx).requestAll(
      "/projects",
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
