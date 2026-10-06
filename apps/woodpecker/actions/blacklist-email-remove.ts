import type { ActionDefinition } from "@w6w/types";
import { call, requireArray, V2 } from "../lib/client.ts";
import { json } from "../lib/params.ts";

type Input = {
  emails: string[] | string;
};

const blacklistEmailRemove: ActionDefinition<Input> = {
  key: "blacklist-email-remove",
  type: "perform",
  resource: "blacklist",
  title: "Remove Blacklisted Emails",
  description: "Remove up to 500 emails from the blacklist (unknown ones are ignored).",
  idempotent: true,
  params: [
    json("emails", "Emails", { required: true, hint: "JSON array of emails, at most 500." }),
  ],
  output: [
    { key: "emails", type: "array", label: "Emails removed" },
    { key: "count", type: "number", label: "How many" },
  ],

  async execute(input, ctx) {
    const body = await call(ctx, "DELETE", V2, "/blacklist/emails", {
      body: { emails: requireArray("emails", input.emails, 500) },
    }) as { emails?: string[] };
    const emails = body.emails ?? [];
    return { emails, count: emails.length };
  },
};

export default blacklistEmailRemove;
