import type { ActionDefinition } from "@w6w/types";
import { MailerooClient } from "../lib/client.ts";

interface Input {
  limit?: number;
}

export const PROFILE_OUTPUT = [
  { key: "id", type: "string", label: "Sender profile ID (prf_…)" },
  { key: "name", type: "string", label: "Name" },
  { key: "enabledChannels", type: "array", label: "sms, voice, whatsapp, telegram, email" },
  { key: "rateLimit", type: "object", label: "{ max, window_seconds, scope } or null" },
  { key: "createdAt", type: "string", label: "Created at" },
  { key: "updatedAt", type: "string", label: "Updated at" },
] as const;

export function mapProfile(d: Record<string, unknown>) {
  return {
    id: d.id,
    name: d.name,
    enabledChannels: d.enabled_channels ?? [],
    rateLimit: d.rate_limit ?? null,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}

/** `GET /v1/verify/sender-profiles` (scope `verify.sender_profiles.read`). */
const listSenderProfiles: ActionDefinition<Input> = {
  key: "list-sender-profiles",
  type: "search",
  resource: "sender-profile",
  title: "List Sender Profiles",
  description:
    "List OTP Verification sender profiles (name, enabled channels, rate limit). Their " +
    "IDs feed Send Verification Code. Account API Key (verify.sender_profiles.read).",
  params: [{
    key: "limit",
    label: "Limit",
    type: "number",
    default: 50,
    validation: { min: 1, max: 100, integer: true },
  }],
  output: [{ key: "profiles", type: "array", label: "Sender profiles" }],

  async execute(input, ctx) {
    const { data } = await new MailerooClient(ctx).account("/verify/sender-profiles", {
      query: { limit: input.limit },
    });
    const list = Array.isArray(data) ? data as Record<string, unknown>[] : [];
    return { profiles: list.map(mapProfile) };
  },
};

export default listSenderProfiles;
