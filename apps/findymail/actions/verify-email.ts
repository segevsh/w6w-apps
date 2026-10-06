import type { ActionDefinition } from "@w6w/types";
import { FindymailClient } from "../lib/client.ts";

interface Input {
  email: string;
}

const verifyEmail: ActionDefinition<Input> = {
  key: "verify-email",
  type: "search",
  resource: "verifier",
  title: "Verify Email",
  description:
    "Verify that an email address is deliverable. Uses one verifier credit on every attempted verification. Spends credits only on a hit; a 402 means the balance is empty and a 423 that the subscription is paused.",
  params: [{
    "key": "email",
    "label": "Email",
    "type": "string",
    "required": true,
    "hint": "The address to verify.",
  }],
  output: [{ "key": "email", "type": "string", "label": "Email" }, {
    "key": "verified",
    "type": "boolean",
    "label": "Deliverable",
  }, { "key": "provider", "type": "string", "label": "Mailbox provider" }],

  async execute(input, ctx) {
    return await new FindymailClient(ctx).request("POST", "/api/verify", {
      body: { email: input.email },
    });
  },
};

export default verifyEmail;
