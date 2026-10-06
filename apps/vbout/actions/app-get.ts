import type { ActionDefinition } from "@w6w/types";
import { VboutClient } from "../lib/client.ts";

/**
 * `GET /1/app/me.json` — Return the business details of the account the API key belongs to.
 */
type Input = Record<string, never>;

const appGet: ActionDefinition<Input> = {
  key: "app-get",
  type: "read",
  resource: "app",
  title: "Get Account",
  description: "Return the business details of the account the API key belongs to.",
  params: [],
  output: [
    {
      key: "business",
      type: "object",
      label: "Business (id, businessName, contactName, phoneNumber, vboutName, package)",
    },
  ],

  async execute(_input, ctx) {
    return await new VboutClient(ctx).get("app/me");
  },
};

export default appGet;
