import type { ActionDefinition } from "@w6w/types";
import { GoogleChatClient, userName } from "../lib/client.ts";

interface Input {
  spaceType: "SPACE" | "GROUP_CHAT" | "DIRECT_MESSAGE";
  displayName?: string;
  description?: string;
  members?: string[];
}

interface Membership {
  member: { name: string; type: "HUMAN" };
}

interface SetUpSpacePayload {
  space: {
    spaceType: string;
    displayName?: string;
    spaceDetails?: { description?: string };
  };
  memberships?: Membership[];
  requestId?: string;
}

/**
 * `spaces.setup` — POST /v1/spaces:setup
 * https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces/setup
 *
 * The one call that creates a space *and* adds people to it, which is what
 * "start a chat with these three people" actually needs. It is user-auth only
 * (`chat.spaces` / `chat.spaces.create`) — there is no app-auth equivalent.
 *
 * Google's shape rules, all enforced by the API rather than invented here:
 *   - `SPACE` requires `displayName`.
 *   - `GROUP_CHAT` requires at least two memberships and no `displayName`.
 *   - `DIRECT_MESSAGE` requires exactly one membership and no `displayName`.
 * The caller is added automatically and must not be listed.
 */
const setupSpace: ActionDefinition<Input> = {
  key: "setup-space",
  type: "perform",
  resource: "space",
  title: "Set Up Space",
  description:
    "Create a space, group chat or direct message and add members in a single call. The authenticated user is added automatically.",
  // Deduplicated server-side by `requestId` (the invocation id).
  idempotent: true,
  params: [
    {
      key: "spaceType",
      label: "Space type",
      type: "select",
      required: true,
      options: [
        { value: "SPACE", label: "Named space — requires a name" },
        { value: "GROUP_CHAT", label: "Group chat — requires 2+ members, no name" },
        { value: "DIRECT_MESSAGE", label: "Direct message — exactly 1 member, no name" },
      ],
    },
    {
      key: "displayName",
      label: "Space name",
      type: "string",
      hint: "Required for a named space; must be omitted for a group chat or direct message.",
      validation: { maxLength: 128 },
      showIf: { "==": [{ var: "spaceType" }, "SPACE"] },
    },
    {
      key: "description",
      label: "Description",
      type: "text",
      validation: { maxLength: 150 },
      showIf: { "==": [{ var: "spaceType" }, "SPACE"] },
    },
    {
      key: "members",
      label: "Members",
      type: "json",
      hint:
        "Array of user ids or `users/{user}` resource names. `{user}` is the People API person id or the Directory API user id — not an email address. Do not include yourself.",
      placeholder: '["users/123456789", "users/987654321"]',
    },
  ],
  output: [
    { key: "name", type: "string", label: "Resource name" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "spaceType", type: "string", label: "Space type" },
    { key: "spaceUri", type: "string", label: "Link to the space" },
  ],

  async execute(input, ctx) {
    const client = new GoogleChatClient(ctx);
    const body: SetUpSpacePayload = {
      space: { spaceType: input.spaceType },
      requestId: ctx.invocation?.invocationId,
    };
    if (input.displayName !== undefined) body.space.displayName = input.displayName;
    if (input.description !== undefined) {
      body.space.spaceDetails = { description: input.description };
    }
    if (input.members?.length) {
      body.memberships = input.members.map((m) => ({
        member: { name: userName(m), type: "HUMAN" },
      }));
    }

    return await client.request(`/spaces:setup`, { method: "POST", body });
  },
};

export default setupSpace;
