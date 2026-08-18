import type { ActionDefinition } from "@w6w/types";
import { BigQueryClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /projects` — verified against BigQuery's discovery document
 * (`projects.list`).
 *
 * The one action that takes no project: it lists those the credential can see,
 * which is how you find the id every other action needs. Note that it lists
 * projects **with BigQuery enabled**, not every Google Cloud project.
 */
const action: ActionDefinition = {
  key: "project-list",
  type: "read",
  resource: "project",
  title: "List projects",
  description: "List the Google Cloud projects this connection can use BigQuery in.",
  params: [...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing BigQuery projects", { returnAll, limit });

    return await new BigQueryClient(ctx).requestAll(
      "/projects",
      "projects",
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
