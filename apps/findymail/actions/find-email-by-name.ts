import type { ActionDefinition } from "@w6w/types";
import { compact, FindymailClient } from "../lib/client.ts";

interface Input {
  name: string;
  domain: string;
  webhook_url?: string;
}

const findEmailByName: ActionDefinition<Input> = {
  key: "find-email-by-name",
  type: "search",
  resource: "finder",
  title: "Find Email by Name",
  description:
    "Find someone's verified email from their full name and company. Uses one finder credit only if a verified email is found. Spends credits only on a hit; a 402 means the balance is empty and a 423 that the subscription is paused.",
  params: [{ "key": "name", "label": "Full name", "type": "string", "required": true }, {
    "key": "domain",
    "label": "Company domain",
    "type": "string",
    "required": true,
    "hint": "The company domain (best) or company name.",
  }, {
    "key": "webhook_url",
    "label": "Webhook URL",
    "type": "string",
    "hint":
      "If set, the search runs in the background and Findymail POSTs the result to this URL; the action then returns Findymail's acknowledgement, not the contact.",
  }],
  output: [{
    "key": "contact",
    "type": "object",
    "label": "Contact (name, domain, email) — only when found synchronously",
  }, {
    "key": "payload",
    "type": "object",
    "label": "Present instead when a webhook URL was given",
  }],

  async execute(input, ctx) {
    return await new FindymailClient(ctx).request("POST", "/api/search/name", {
      body: compact({ name: input.name, domain: input.domain, webhook_url: input.webhook_url }),
    });
  },
};

export default findEmailByName;
