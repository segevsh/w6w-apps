import type { ActionDefinition } from "@w6w/types";
import { InoreaderClient } from "../lib/client.ts";

/**
 * `GET /reader/api/0/user-info` (zone 1) — basic information about the signed-in user.
 * Documented response: `userId`, `userName`, `userProfileId`, `userEmail`, `isBloggerUser`,
 * `signupTimeSec`, `isMultiLoginEnabled`.
 */
const userInfo: ActionDefinition<Record<string, never>> = {
  key: "user-info",
  type: "read",
  resource: "user",
  title: "Get User Info",
  description:
    "Basic information about the connected Inoreader user (id, name, email, signup time).",
  params: [],
  output: [
    { key: "userId", type: "string", label: "User ID" },
    { key: "userName", type: "string", label: "User name" },
    { key: "userProfileId", type: "string", label: "Profile ID" },
    { key: "userEmail", type: "string", label: "Email" },
    { key: "isBloggerUser", type: "boolean", label: "Blogger user" },
    { key: "signupTimeSec", type: "number", label: "Signup time (unix seconds)" },
    { key: "isMultiLoginEnabled", type: "boolean", label: "Multi-login enabled" },
  ],

  async execute(_input, ctx) {
    return await new InoreaderClient(ctx).json("/user-info");
  },
};

export default userInfo;
