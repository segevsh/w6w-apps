import type { ActionDefinition } from "@w6w/types";
import { type WizaBody, WizaClient } from "../lib/client.ts";

const getCredits: ActionDefinition<Record<string, never>> = {
  key: "get-credits",
  type: "read",
  resource: "account",
  title: "Get Credits",
  description:
    'Read the credits remaining on the account (GET /api/meta/credits): email, phone, export and API credits. Email and phone credits are the string "unlimited" on an unlimited plan.',
  params: [],
  output: [
    { key: "email_credits", type: "string", label: 'Email credits left, or "unlimited"' },
    { key: "phone_credits", type: "string", label: 'Phone credits left, or "unlimited"' },
    { key: "export_credits", type: "number", label: "Export credits left" },
    { key: "api_credits", type: "number", label: "API credits left (what the API bills against)" },
  ],

  async execute(_input, ctx) {
    const body = await new WizaClient(ctx).call<WizaBody & { credits?: Record<string, unknown> }>(
      "/api/meta/credits",
    );
    return body.credits ?? {};
  },
};

export default getCredits;
