import type { ActionDefinition } from "@w6w/types";
import { ResendClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /emails` — verified against Resend's OpenAPI document. It takes the
 * shared `limit` / `after` / `before` cursor parameters and answers
 * `{ object, has_more, data }`.
 */
const action: ActionDefinition = {
  key: "email-list",
  type: "read",
  resource: "email",
  title: "List emails",
  description: "List the emails this account has sent, newest first.",
  params: [...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Resend emails", { returnAll, limit });

    return await new ResendClient(ctx).requestAll("/emails", {}, returnAll ? Infinity : limit);
  },
};

export default action;
