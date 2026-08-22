import type { ActionDefinition } from "@w6w/types";
import { ReplicateClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /trainings` — verified against Replicate's OpenAPI document.
 *
 * Cursor-paged like everything else here: `next` is a complete URL rather than
 * a token, and the client follows it verbatim.
 */
const action: ActionDefinition = {
  key: "training-list",
  type: "read",
  resource: "training",
  title: "List trainings",
  description: "The account's trainings, newest first.",
  params: [...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Replicate training records", { returnAll, limit });

    return await new ReplicateClient(ctx).requestAll(
      "/trainings",
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
