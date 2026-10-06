import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";

type Input = Record<string, never>;

const creditsGet: ActionDefinition<Input, ActionResult> = {
  key: "credits-get",
  type: "read",
  resource: "account",
  title: "Get Credit Balance",
  description: "Read the credits remaining on the LinkupAPI account. Consumes no credits.",
  params: [],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(_input, ctx) {
    return await new LinkupApiClient(ctx).request("GET", "/v2/credits");
  },
};

export default creditsGet;
