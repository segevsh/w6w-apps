import type { ActionDefinition } from "@w6w/types";
import { compact, FindymailClient } from "../lib/client.ts";

interface Input {
  linkedin_url: string;
  webhook_url?: string;
}

const findEmailByLinkedin: ActionDefinition<Input> = {
  key: "find-email-by-linkedin",
  type: "search",
  resource: "finder",
  title: "Find Email from LinkedIn Profile",
  description:
    "Find someone's verified email from their business profile (LinkedIn) URL. Uses one finder credit only if a verified email is found. Spends credits only on a hit; a 402 means the balance is empty and a 423 that the subscription is paused.",
  params: [{
    "key": "linkedin_url",
    "label": "LinkedIn URL",
    "type": "string",
    "required": true,
    "hint": "A full profile URL ending in /in/<username>, or the username alone.",
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
    return await new FindymailClient(ctx).request("POST", "/api/search/business-profile", {
      body: compact({ linkedin_url: input.linkedin_url, webhook_url: input.webhook_url }),
    });
  },
};

export default findEmailByLinkedin;
