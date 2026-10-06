import type { ActionDefinition } from "@w6w/types";
import { ClearoutClient, compact } from "../lib/client.ts";

interface Input {
  email: string;
  timeout?: number;
}

/**
 * `POST /email_verify/instant` — verify one address without going through the queue.
 * Spends a credit per verified address (not for the documented `*@example.com` test
 * addresses, e.g. `valid@example.com`). The vendor's `status` (`valid`, `invalid`,
 * `catch_all`, `unknown`, …) and `safe_to_send` are strings, passed through unchanged.
 */
const verifyEmail: ActionDefinition<Input> = {
  key: "verify-email",
  type: "read",
  resource: "email",
  title: "Verify Email",
  description: "Verify one email address in real time and get its status, whether it is safe " +
    "to send to, and disposable / free / role / gibberish flags. Costs a credit.",
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    {
      key: "timeout",
      label: "Timeout (ms)",
      type: "number",
      validation: { min: 1000, max: 180000, integer: true },
      hint: "How long Clearout may take (1000-180000 ms, vendor default 130000).",
    },
  ],
  output: [
    { key: "emailAddress", type: "string", label: "Email address" },
    { key: "status", type: "string", label: "valid, invalid, catch_all, unknown, ..." },
    { key: "safeToSend", type: "string", label: "yes, no or risky" },
    { key: "subStatus", type: "object", label: "Sub-status code and description" },
    { key: "disposable", type: "string", label: "Disposable address (yes/no)" },
    { key: "free", type: "string", label: "Free provider (yes/no)" },
    { key: "role", type: "string", label: "Role address (yes/no)" },
    { key: "gibberish", type: "string", label: "Gibberish address (yes/no)" },
    { key: "suggestedEmailAddress", type: "string", label: "Suggested correction" },
    { key: "bounceType", type: "string", label: "Bounce type" },
    { key: "detailInfo", type: "object", label: "MX record, SMTP provider, account, domain" },
    { key: "verifiedOn", type: "string", label: "Verified on" },
    { key: "timeTaken", type: "number", label: "Time taken (ms)" },
  ],

  async execute(input, ctx) {
    const email = String(input.email ?? "").trim();
    if (!email) throw new Error("email is required");
    const { data } = await new ClearoutClient(ctx).request("/email_verify/instant", {
      body: compact({ email, timeout: input.timeout }),
    });
    const d = (data ?? {}) as Record<string, unknown>;
    return {
      emailAddress: d.email_address,
      status: d.status,
      safeToSend: d.safe_to_send,
      subStatus: d.sub_status,
      disposable: d.disposable,
      free: d.free,
      role: d.role,
      gibberish: d.gibberish,
      suggestedEmailAddress: d.suggested_email_address,
      bounceType: d.bounce_type,
      detailInfo: d.detail_info,
      verifiedOn: d.verified_on,
      timeTaken: d.time_taken,
    };
  },
};

export default verifyEmail;
