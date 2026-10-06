import type { ActionDefinition } from "@w6w/types";
import { MailerooClient, seg } from "../lib/client.ts";

interface Input {
  verificationId: string;
}

export const VERIFICATION_OUTPUT = [
  { key: "id", type: "string", label: "Verification ID" },
  { key: "senderProfileId", type: "string", label: "Sender profile" },
  { key: "channel", type: "string", label: "Channel" },
  { key: "to", type: "string", label: "Destination" },
  { key: "country", type: "string", label: "Country" },
  { key: "codeLength", type: "number", label: "Code length" },
  { key: "status", type: "string", label: "pending, sent, verified, expired, failed, cancelled" },
  { key: "attempts", type: "number", label: "Checks made" },
  { key: "maxAttempts", type: "number", label: "Checks allowed" },
  { key: "expiresAt", type: "string", label: "Expires at" },
  { key: "verifiedAt", type: "string", label: "Verified at" },
  { key: "createdAt", type: "string", label: "Created at" },
] as const;

export function mapVerification(d: Record<string, unknown>) {
  return {
    id: d.id,
    senderProfileId: d.sender_profile_id,
    channel: d.channel,
    to: d.to,
    country: d.country,
    codeLength: d.code_length,
    status: d.status,
    attempts: d.attempts,
    maxAttempts: d.max_attempts,
    expiresAt: d.expires_at,
    verifiedAt: d.verified_at,
    createdAt: d.created_at,
  };
}

/** `GET /v1/verify/verifications/:id` (scope `verify.verifications.read`). */
const getVerification: ActionDefinition<Input> = {
  key: "get-verification",
  type: "read",
  resource: "verification",
  title: "Get Verification",
  description: "Read a verification and its lifecycle status (pending, sent, verified, expired, " +
    "failed, cancelled). The code is never included. Account API Key (verify.verifications.read).",
  params: [{ key: "verificationId", label: "Verification ID", type: "string", required: true }],
  output: [...VERIFICATION_OUTPUT],

  async execute(input, ctx) {
    const { data } = await new MailerooClient(ctx).account(
      `/verify/verifications/${seg(input.verificationId, "verificationId")}`,
    );
    return mapVerification((data ?? {}) as Record<string, unknown>);
  },
};

export default getVerification;
