import type { ActionDefinition } from "@w6w/types";
import { FindymailClient } from "../lib/client.ts";

type Input = Record<string, never>;

const getCredits: ActionDefinition<Input> = {
  key: "get-credits",
  type: "read",
  resource: "usage",
  title: "Get Remaining Credits",
  description: "Get the finder and verifier credit balances. Free.",
  params: [],
  output: [{ "key": "credits", "type": "number", "label": "Finder credits" }, {
    "key": "verifier_credits",
    "type": "number",
    "label": "Verifier credits",
  }],

  async execute(_input, ctx) {
    return await new FindymailClient(ctx).request("GET", "/api/credits");
  },
};

export default getCredits;
