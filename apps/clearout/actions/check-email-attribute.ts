import type { ActionDefinition } from "@w6w/types";
import { ClearoutClient, compact } from "../lib/client.ts";

interface Input {
  email: string;
  check: string;
  timeout?: number;
}

const CHECKS = ["catchall", "disposable", "business", "free", "role", "gibberish"];

/**
 * `POST /email/verify/{catchall|disposable|business|free|role|gibberish}` — the vendor's
 * single-attribute checks. NOTE the path prefix is `/email/verify/…` (slash), unlike the
 * `/email_verify/…` (underscore) of every other verifier endpoint. The vendor's own
 * response schemas for these six are copy-pasted from each other (the `free`, `role` and
 * `gibberish` ones all document a `business_account` field), so the field names are not
 * trusted: the vendor's `data` object is returned as is.
 */
const checkEmailAttribute: ActionDefinition<Input> = {
  key: "check-email-attribute",
  type: "read",
  resource: "email",
  title: "Check Email Attribute",
  description: "Run one targeted check on an address: catch-all domain, disposable, business " +
    "(work) account, free provider, role account or gibberish. Returns the vendor's result " +
    "object as is.",
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    {
      key: "check",
      label: "Check",
      type: "select",
      required: true,
      options: CHECKS.map((c) => ({ value: c, label: c })),
    },
    {
      key: "timeout",
      label: "Timeout (ms)",
      type: "number",
      validation: { min: 1000, max: 180000, integer: true },
    },
  ],
  output: [
    { key: "check", type: "string", label: "Check that was run" },
    {
      key: "result",
      type: "object",
      label: "Vendor result (email_address, the flag, verified_on, time_taken)",
    },
  ],

  async execute(input, ctx) {
    const email = String(input.email ?? "").trim();
    if (!email) throw new Error("email is required");
    if (!CHECKS.includes(input.check)) {
      throw new Error(`check must be one of ${CHECKS.join(", ")}`);
    }
    const { data } = await new ClearoutClient(ctx).request(`/email/verify/${input.check}`, {
      body: compact({ email, timeout: input.timeout }),
    });
    return { check: input.check, result: data ?? null };
  },
};

export default checkEmailAttribute;
