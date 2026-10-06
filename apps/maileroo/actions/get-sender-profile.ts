import type { ActionDefinition } from "@w6w/types";
import { MailerooClient, seg } from "../lib/client.ts";
import { mapProfile, PROFILE_OUTPUT } from "./list-sender-profiles.ts";

interface Input {
  senderProfileId: string;
}

/** `GET /v1/verify/sender-profiles/:id` (scope `verify.sender_profiles.read`). */
const getSenderProfile: ActionDefinition<Input> = {
  key: "get-sender-profile",
  type: "read",
  resource: "sender-profile",
  title: "Get Sender Profile",
  description: "Read one OTP Verification sender profile. Account API Key " +
    "(verify.sender_profiles.read).",
  params: [{ key: "senderProfileId", label: "Sender profile ID", type: "string", required: true }],
  output: [...PROFILE_OUTPUT],

  async execute(input, ctx) {
    const { data } = await new MailerooClient(ctx).account(
      `/verify/sender-profiles/${seg(input.senderProfileId, "senderProfileId")}`,
    );
    return mapProfile((data ?? {}) as Record<string, unknown>);
  },
};

export default getSenderProfile;
