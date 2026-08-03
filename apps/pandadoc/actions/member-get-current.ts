import type { ActionDefinition } from "@w6w/types";
import { PandaDocClient } from "../lib/client.ts";

/**
 * `GET /public/v1/members/current` — who this API key belongs to.
 *
 * Useful beyond a whoami: `membership_id` is the value
 * `document-create-from-template`'s `owner` and `document-send`'s `sender` take
 * when acting on another member's behalf, and `workspace` tells you which
 * workspace the key actually addresses — which matters because a PandaDoc
 * organization can hold several and a key is scoped to one.
 *
 * `user_license` (Full, Read-only, eSignature, Guest, Creator) and `role`
 * explain most `403`s: a key inherits its owner's permissions, so a read-only
 * licence cannot create documents no matter how the key was minted.
 *
 * This is also the probe the auth `test` hook runs — it needs no resource to
 * exist and no permission beyond membership.
 */
const memberGetCurrent: ActionDefinition<Record<string, never>> = {
  key: "member-get-current",
  type: "read",
  resource: "member",
  title: "Get Current Member",
  description:
    "Read the workspace member this API key belongs to — membership id, workspace, role and licence.",
  params: [],
  output: [
    { key: "user_id", type: "string", label: "User ID (organization level)" },
    { key: "membership_id", type: "string", label: "Membership ID (workspace level)" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "workspace", type: "string", label: "Active workspace ID" },
    { key: "workspace_name", type: "string", label: "Workspace name" },
    { key: "role", type: "string", label: "Workspace role" },
    { key: "user_license", type: "string", label: "Licence type" },
    { key: "is_active", type: "boolean", label: "Active" },
  ],

  async execute(_input, ctx) {
    return await new PandaDocClient(ctx).request("/members/current");
  },
};

export default memberGetCurrent;
