import type { ActionDefinition } from "@w6w/types";
import { PATHS, WappalyzerClient } from "../lib/client.ts";
import { creditsOutputFields } from "../lib/params.ts";

/**
 * `GET /v2/verify/` — deliverability signals for one email address.
 *
 * Verified against the `VerifyResult` schema in Wappalyzer's OpenAPI contract
 * and `docs/api/v2/verify/` (fetched 2026-09-29). The response is a flat,
 * fully-required object, so every field is enumerated here rather than
 * passed through as a blob — this is the one endpoint in the app whose shape
 * is small and stable enough that doing so does not risk drifting from the
 * vendor's schema.
 */
interface Input {
  email: string;
}

interface VerifyResult {
  email: string;
  domain: string;
  reachable: "safe" | "risky" | "invalid" | "unknown";
  disposable: boolean;
  roleAccount: boolean;
  mxValid: boolean;
  connection: boolean;
  inboxFull: boolean;
  catchAll: boolean;
  deliverable: boolean;
  disabled: boolean;
  syntaxValid: boolean;
}

const verifyEmail: ActionDefinition<Input> = {
  key: "verify-email",
  type: "read",
  resource: "verify",
  title: "Verify Email Address",
  description:
    "Check an email address's deliverability — reachability, disposable/role-account/catch-all " +
    "detection, MX and SMTP-connection validity.",
  params: [
    {
      key: "email",
      label: "Email address",
      type: "string",
      required: true,
      placeholder: "name@example.com",
      validation: { pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" },
    },
  ],
  output: [
    { key: "email", type: "string", label: "Email address" },
    { key: "domain", type: "string", label: "Domain" },
    { key: "reachable", type: "string", label: "Reachable (safe, risky, invalid, unknown)" },
    { key: "disposable", type: "boolean", label: "Disposable provider" },
    { key: "roleAccount", type: "boolean", label: "Role account (e.g. info@, support@)" },
    { key: "mxValid", type: "boolean", label: "Domain has valid MX records" },
    { key: "connection", type: "boolean", label: "SMTP server accepts connections" },
    { key: "inboxFull", type: "boolean", label: "Recipient inbox is full" },
    { key: "catchAll", type: "boolean", label: "Catch-all address" },
    { key: "deliverable", type: "boolean", label: "Deliverable" },
    { key: "disabled", type: "boolean", label: "Recipient inbox is disabled" },
    { key: "syntaxValid", type: "boolean", label: "Syntactically valid" },
    ...creditsOutputFields,
  ],

  async execute(input, ctx) {
    const client = new WappalyzerClient(ctx);
    const { data, creditsSpent, creditsRemaining } = await client.get<VerifyResult>(
      PATHS.verify,
      { email: input.email },
    );
    return { ...data, creditsSpent, creditsRemaining };
  },
};

export default verifyEmail;
