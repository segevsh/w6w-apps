import type { ActionDefinition } from "@w6w/types";
import { call, requireArray, V2 } from "../lib/client.ts";
import { json } from "../lib/params.ts";

type Input = {
  emails: string[] | string;
};

const blacklistEmailAdd: ActionDefinition<Input> = {
  key: "blacklist-email-add",
  type: "perform",
  resource: "blacklist",
  title: "Blacklist Emails",
  description: "Add up to 500 emails to the blacklist; prospects on them are no longer contacted.",
  idempotent: true,
  params: [
    json("emails", "Emails", { required: true, hint: "JSON array of emails, at most 500." }),
  ],
  output: [
    { key: "emails", type: "array", label: "Emails now blacklisted" },
    { key: "count", type: "number", label: "How many" },
  ],

  async execute(input, ctx) {
    const body = await call(ctx, "POST", V2, "/blacklist/emails", {
      body: { emails: requireArray("emails", input.emails, 500) },
    }) as { emails?: string[] };
    const emails = body.emails ?? [];
    return { emails, count: emails.length };
  },
};

export default blacklistEmailAdd;
