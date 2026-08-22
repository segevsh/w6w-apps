import type { ActionDefinition } from "@w6w/types";
import { ResendClient } from "../lib/client.ts";

/**
 * `GET /audiences` — verified against Resend's OpenAPI document.
 *
 * Unlike `/emails` and `/domains`, this response is `{ object, data }` with
 * **no `has_more`** and no cursor parameters, so there is nothing to page: the
 * whole list comes back at once and the action returns it as-is rather than
 * pretending to paginate.
 */
const action: ActionDefinition = {
  key: "audience-list",
  type: "read",
  resource: "audience",
  title: "List audiences",
  description: "List every audience on this account.",
  params: [],
  output: [
    { key: "object", type: "string", label: "Object type" },
    { key: "data", type: "array", label: "Audiences" },
  ],

  async execute(_input, ctx) {
    ctx.log("info", "listing Resend audiences");
    return await new ResendClient(ctx).request("/audiences");
  },
};

export default action;
