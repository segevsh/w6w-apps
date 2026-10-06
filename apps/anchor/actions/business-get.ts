import type { ActionDefinition } from "@w6w/types";
import { AnchorClient } from "../lib/client.ts";

/** `GET /me` — Anchor operation `getActiveBusiness`. */
type Input = Record<string, never>;

const businessGet: ActionDefinition<Input> = {
  key: "business-get",
  type: "read",
  resource: "business",
  title: "Get Active Business",
  description: "Return the Anchor business the API key is bound to \u2014 its id and display name.",
  params: [],
  output: [
    { key: "businessId", type: "string", label: "Business ID" },
    { key: "businessName", type: "string", label: "Business name" },
  ],

  execute(_input, ctx) {
    return new AnchorClient(ctx).request("GET", "/me");
  },
};

export default businessGet;
