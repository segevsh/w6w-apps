import type { ActionDefinition } from "@w6w/types";
import { RocketReachClient } from "../lib/client.ts";

type Input = { email: string };

/**
 * `POST /email/verify/` (trailing slash, as published). Charges one email
 * verification credit — a separate pool from lookup credits — refunded when the
 * status is `unknown`. Out of credits is `402` with `credit_type` and
 * `purchase_url`. Limits: 10/second and 300/minute on every plan.
 */
const verifyEmail: ActionDefinition<Input> = {
  key: "verify-email",
  type: "perform",
  idempotent: false,
  resource: "email",
  title: "Verify Email",
  description: "Check whether one email address can receive mail: valid, invalid, catchall or " +
    "unknown, with the format, domain, disposable and catch-all checks behind it. Charges one " +
    "email verification credit (a separate balance from lookup credits), refunded when the " +
    "result is unknown.",
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      hint: "At most 254 characters.",
      validation: { maxLength: 254 },
    },
  ],
  output: [
    { key: "email", type: "string", label: "The address verified, canonicalized" },
    { key: "status", type: "string", label: "valid, invalid, catchall or unknown" },
    { key: "creditsCharged", type: "number", label: "1, or 0 when the status is unknown" },
    { key: "mxRecord", type: "string", label: "The domain's primary MX host" },
    { key: "checks", type: "object", label: "format_valid, domain_valid, disposable, catchall" },
  ],

  async execute(input, ctx) {
    const email = String(input.email ?? "").trim();
    if (!email) throw new Error("Email is required");
    const { body } = await new RocketReachClient(ctx).request("/email/verify/", {
      method: "POST",
      body: { email },
    });
    const v = (body ?? {}) as Record<string, unknown>;
    return {
      email: v.email ?? email,
      status: v.status,
      creditsCharged: v.credits_charged,
      mxRecord: v.mx_record ?? null,
      checks: v.checks ?? null,
    };
  },
};

export default verifyEmail;
