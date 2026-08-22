import type { ActionDefinition } from "@w6w/types";
import { ResendClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /broadcasts` — verified against Resend's OpenAPI document. Takes the
 * shared cursor parameters and answers `{ object, has_more, data }`.
 */
const action: ActionDefinition = {
  key: "broadcast-list",
  type: "read",
  resource: "broadcast",
  title: "List broadcasts",
  description: "List this account's broadcasts and their status.",
  params: [...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Resend broadcasts", { returnAll, limit });

    return await new ResendClient(ctx).requestAll("/broadcasts", {}, returnAll ? Infinity : limit);
  },
};

export default action;
