import type { ActionDefinition } from "@w6w/types";
import { GoogleChatClient, spaceName, userName } from "../lib/client.ts";

interface Input {
  space: string;
  user?: string;
  group?: string;
  role?: "ROLE_MEMBER" | "ROLE_MANAGER";
}

interface MembershipPayload {
  member?: { name: string; type: "HUMAN" };
  groupMember?: { name: string };
  role?: string;
}

/**
 * `spaces.members.create` — POST /v1/{parent=spaces/*}/members
 * https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces.members/create
 *
 * A membership names *either* a user (`member`) or a Google Group
 * (`groupMember`) — never both, and Google rejects a request carrying both.
 * Group memberships are documented as not supported in direct messages or
 * group chats, only in named spaces.
 *
 * Adding a Chat *app* to a space is a different call shape requiring the
 * `chat.memberships.app` scope and app authentication, so it is not offered
 * here — this app only adds humans and groups.
 */
const createMember: ActionDefinition<Input> = {
  key: "create-member",
  type: "perform",
  resource: "membership",
  title: "Add Member",
  description:
    "Add a user or a Google Group to a space. Adding a Chat app requires app (bot) authentication and is not available with a user connection.",
  // Adding an existing member returns ALREADY_EXISTS rather than duplicating —
  // the end state is the same, so a retry is safe.
  idempotent: true,
  params: [
    {
      key: "space",
      label: "Space",
      type: "string",
      required: true,
      hint: "The space id, or the full resource name `spaces/{space}`.",
      placeholder: "spaces/AAAAAAAAAAA",
    },
    {
      key: "user",
      label: "User",
      type: "string",
      hint:
        "A user id or the full `users/{user}` resource name. `{user}` is the People API person id or the Directory API user id. Mutually exclusive with Google Group.",
      placeholder: "users/123456789",
    },
    {
      key: "group",
      label: "Google Group",
      type: "string",
      hint:
        "A Google Group resource name, `groups/{group}`. Named spaces only — not supported in DMs or group chats. Mutually exclusive with User.",
      placeholder: "groups/123456789",
    },
    {
      key: "role",
      label: "Role",
      type: "select",
      options: [
        { value: "ROLE_MEMBER", label: "Member" },
        { value: "ROLE_MANAGER", label: "Space manager" },
      ],
      hint: "Only supported in named spaces. Google's default is member.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Membership resource name" },
    { key: "state", type: "string", label: "Membership state" },
    { key: "role", type: "string", label: "Role" },
    { key: "member", type: "object", label: "Member" },
  ],

  async execute(input, ctx) {
    const client = new GoogleChatClient(ctx);
    if (!input.user && !input.group) {
      throw new Error("Google Chat: supply either a user or a Google Group to add");
    }
    if (input.user && input.group) {
      throw new Error(
        "Google Chat: a membership names either a user or a Google Group, never both",
      );
    }

    const body: MembershipPayload = {};
    if (input.user) body.member = { name: userName(input.user), type: "HUMAN" };
    if (input.group) body.groupMember = { name: input.group.trim() };
    if (input.role !== undefined) body.role = input.role;

    return await client.request(`/${spaceName(input.space)}/members`, { method: "POST", body });
  },
};

export default createMember;
