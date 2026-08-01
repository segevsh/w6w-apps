import type { ActionDefinition } from "@w6w/types";
import { fetchUserInfo } from "../lib/client.ts";

/**
 * `GET /v2/userinfo` — the OpenID Connect userinfo endpoint from "Sign In
 * with LinkedIn using OpenID Connect". Needs only `openid` + `profile` (+
 * `email` for the email field), which both auth methods this app declares
 * request — this is the narrowest-scope read available, and the one
 * `auth/oauth2.ts`'s `test` hook probes for the same reason.
 * https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2
 *
 * `sub` is the member id every other action's "Myself" author needs — this
 * is how a workflow discovers it.
 */
const getCurrentMemberProfile: ActionDefinition<Record<string, never>> = {
  key: "get-current-member-profile",
  type: "read",
  resource: "profile",
  title: "Get Current Member Profile",
  description: "Fetch the authenticated member's OpenID Connect profile (id, name, email).",
  params: [],
  output: [
    { key: "sub", type: "string", label: "Member ID" },
    { key: "name", type: "string", label: "Full name" },
    { key: "given_name", type: "string", label: "First name" },
    { key: "family_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "picture", type: "string", label: "Profile picture URL" },
  ],

  async execute(_input, ctx) {
    const res = await fetchUserInfo(ctx);
    if (!res.ok) throw new Error(`LinkedIn ${res.status} for GET /v2/userinfo`);
    return res.json();
  },
};

export default getCurrentMemberProfile;
