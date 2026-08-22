import type { ActionDefinition } from "@w6w/types";
import { ResendClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /domains` — verified against Resend's OpenAPI document. Answers
 * `{ object, has_more, data }` and takes the shared cursor parameters.
 */
const action: ActionDefinition = {
  key: "domain-list",
  type: "read",
  resource: "domain",
  title: "List domains",
  description: "List the sending domains on this account and their verification status.",
  params: [...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Resend domains", { returnAll, limit });

    return await new ResendClient(ctx).requestAll("/domains", {}, returnAll ? Infinity : limit);
  },
};

export default action;
