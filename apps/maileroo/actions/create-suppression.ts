import type { ActionDefinition } from "@w6w/types";
import { compact, MailerooClient, need } from "../lib/client.ts";

interface Input {
  emailAddress: string;
  reason?: string;
}

/** `POST /v1/suppressions` (scope `suppressions.write`) → `201` with the created row. */
const createSuppression: ActionDefinition<Input> = {
  key: "create-suppression",
  type: "perform",
  idempotent: false,
  resource: "suppression",
  title: "Add Suppression",
  description: "Add an email address to the suppression list so Maileroo no longer delivers to " +
    "it. Account API Key (suppressions.write).",
  params: [
    { key: "emailAddress", label: "Email address", type: "string", required: true },
    { key: "reason", label: "Reason", type: "string", hint: "Optional note, e.g. `Unsubscribed`." },
  ],
  output: [
    { key: "id", type: "number", label: "Suppression ID" },
    { key: "emailAddress", type: "string", label: "Email address" },
    { key: "reason", type: "string", label: "Reason" },
  ],

  async execute(input, ctx) {
    const { data } = await new MailerooClient(ctx).account("/suppressions", {
      body: compact({
        email_address: need(input.emailAddress, "emailAddress"),
        reason: input.reason,
      }),
    });
    const d = (data ?? {}) as Record<string, unknown>;
    return { id: d.id, emailAddress: d.email_address, reason: d.reason };
  },
};

export default createSuppression;
