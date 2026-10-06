import type { ActionDefinition } from "@w6w/types";
import { FindymailClient } from "../lib/client.ts";

interface Input {
  linkedin_url: string;
}

const findPhone: ActionDefinition<Input> = {
  key: "find-phone",
  type: "search",
  resource: "finder",
  title: "Find Phone",
  description:
    "Find someone's phone number from their LinkedIn URL. Costs 10 finder credits if a phone is found; requests for EU citizens return nothing for legal reasons. The 200 body is not shown in Findymail's reference, so it is returned verbatim as `result`. Spends credits only on a hit; a 402 means the balance is empty and a 423 that the subscription is paused.",
  params: [{
    "key": "linkedin_url",
    "label": "LinkedIn URL",
    "type": "string",
    "required": true,
    "hint": "A full URL or the username only.",
  }],
  output: [{ "key": "result", "type": "object", "label": "Findymail's response, verbatim" }],

  async execute(input, ctx) {
    const body = await new FindymailClient(ctx).request("POST", "/api/search/phone", {
      body: { linkedin_url: input.linkedin_url },
    });
    return { result: body };
  },
};

export default findPhone;
