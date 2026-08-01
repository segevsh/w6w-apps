import type { ActionDefinition } from "@w6w/types";
import { OneSimpleApiClient } from "../lib/client.ts";

interface Input {
  email: string;
}

interface Output {
  is_format_valid?: boolean;
  is_domain_valid?: boolean;
  domain_has_valid_mx_records?: boolean;
  is_email_free?: boolean;
  is_email_disposable?: boolean;
  is_email_role?: boolean;
  canonical?: string;
  deliverability?: "GOOD" | "FAIR" | "BAD" | string;
  safe_to_register_as_user?: boolean;
  elapsed?: number;
  [key: string]: unknown;
}

/**
 * GET /api/email — multi-tiered email validation: format, domain MX records,
 * disposable/role/free-provider detection, and a canonical address. Response
 * shape confirmed against the vendor's own documented example (docs
 * "Email Validation", checked 2026-08-01).
 */
const validateEmail: ActionDefinition<Input, Output> = {
  key: "validate-email",
  type: "read",
  resource: "utility",
  title: "Validate Email",
  description: "Check whether an email address is deliverable and non-disposable.",
  params: [
    {
      key: "email",
      label: "Email address",
      type: "string",
      required: true,
    },
  ],
  output: [
    { key: "deliverability", type: "string", label: "GOOD / FAIR / BAD" },
    { key: "canonical", type: "string", label: "Canonical address" },
    { key: "is_email_disposable", type: "boolean", label: "Disposable address" },
    { key: "safe_to_register_as_user", type: "boolean", label: "Safe to register" },
  ],

  execute(input, ctx) {
    const client = new OneSimpleApiClient(ctx);
    return client.request<Output>("/email", { query: { email: input.email } });
  },
};

export default validateEmail;
