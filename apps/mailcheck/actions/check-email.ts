import type { ActionDefinition } from "@w6w/types";
import { MailcheckClient } from "../lib/client.ts";

interface Input {
  email: string;
}

/**
 * `POST /v1/singleEmail:check` — process a single email address synchronously.
 * Source: the vendor's live OpenAPI document, https://app.mailcheck.co/openapi.json
 * (`paths["/v1/singleEmail:check"]`, `operationId: "processSingle"`).
 */
const checkEmail: ActionDefinition<Input> = {
  key: "check-email",
  type: "read",
  resource: "email",
  title: "Check Email",
  description: "Verify a single email address's validity and trust score.",
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      placeholder: "name@example.com",
      hint: "The address to check.",
    },
  ],
  output: [
    { key: "email", type: "string", label: "Email" },
    { key: "trustRate", type: "number", label: "Trust rate (0-100)" },
    { key: "mxExists", type: "boolean", label: "MX record exists" },
    { key: "smtpExists", type: "boolean", label: "SMTP mailbox exists" },
    { key: "isNotSmtpCatchAll", type: "boolean", label: "Not a catch-all mailbox" },
    { key: "isNotDisposable", type: "boolean", label: "Not a disposable address" },
    { key: "gravatar", type: "object", label: "Gravatar profile, if any" },
    { key: "githubUsername", type: "string", label: "GitHub username, if any" },
    { key: "facebook", type: "object", label: "Facebook profile, if any" },
  ],

  execute(input, ctx) {
    const client = new MailcheckClient(ctx);
    return client.request("/v1/singleEmail:check", {
      method: "POST",
      body: { email: input.email },
    });
  },
};

export default checkEmail;
