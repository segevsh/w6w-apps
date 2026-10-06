import type { ActionDefinition } from "@w6w/types";
import { compact, FindymailClient } from "../lib/client.ts";

interface Input {
  email: string;
  with_profile?: boolean;
}

const reverseEmailLookup: ActionDefinition<Input> = {
  key: "reverse-email-lookup",
  type: "search",
  resource: "finder",
  title: "Reverse Email Lookup",
  description:
    "Find a business profile from an email address (work or personal). Costs 1 finder credit on a hit, 2 with full profile data. The 200 body is not shown in Findymail's reference, so it is returned verbatim as `result`. Spends credits only on a hit; a 402 means the balance is empty and a 423 that the subscription is paused.",
  params: [{ "key": "email", "label": "Email", "type": "string", "required": true }, {
    "key": "with_profile",
    "label": "Include profile data",
    "type": "boolean",
    "hint": "Costs 2 credits instead of 1.",
  }],
  output: [{ "key": "result", "type": "object", "label": "Findymail's response, verbatim" }],

  async execute(input, ctx) {
    const body = await new FindymailClient(ctx).request("POST", "/api/search/reverse-email", {
      body: compact({ email: input.email, with_profile: input.with_profile }),
    });
    return { result: body };
  },
};

export default reverseEmailLookup;
