import type { ActionDefinition } from "@w6w/types";
import { ResendClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /api-keys` — verified against Resend's OpenAPI document.
 *
 * Listing keys returns their names, ids and creation dates — never the secrets,
 * which Resend shows once at creation and never again. Key **creation** is
 * deliberately not an action in this app: it would put a live credential into a
 * workflow's step output, where it lands in run logs.
 */
const action: ActionDefinition = {
  key: "api-key-list",
  type: "read",
  resource: "apiKey",
  title: "List API keys",
  description: "List this account's API keys. Secrets are never returned.",
  params: [...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Resend API keys", { returnAll, limit });

    return await new ResendClient(ctx).requestAll("/api-keys", {}, returnAll ? Infinity : limit);
  },
};

export default action;
