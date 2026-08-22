import type { ActionDefinition } from "@w6w/types";
import { ReplicateClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /hardware` — verified against Replicate's OpenAPI document.
 *
 * Cursor-paged like everything else here: `next` is a complete URL rather than
 * a token, and the client follows it verbatim.
 */
const action: ActionDefinition = {
  key: "hardware-list",
  type: "read",
  resource: "hardware",
  title: "List hardware",
  description: "The hardware a model can run on, and what each is called.",
  params: [...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Replicate hardware records", { returnAll, limit });

    return await new ReplicateClient(ctx).requestAll("/hardware", {}, returnAll ? Infinity : limit);
  },
};

export default action;
