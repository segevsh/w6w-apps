import type { ActionDefinition } from "@w6w/types";
import { GoogleChatClient, membershipName } from "../lib/client.ts";

interface Input {
  space: string;
  member: string;
}

/**
 * `spaces.members.delete` — DELETE /v1/{name=spaces/*&#47;members/*}
 * https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces.members/delete
 *
 * Google returns the deleted `Membership`, not `Empty`, so the response is
 * passed straight through rather than replaced with a sentinel.
 *
 * `{member}` accepts the user's email address as an alias, which is why the
 * resource-name helper preserves `@` instead of percent-encoding it.
 */
const deleteMember: ActionDefinition<Input> = {
  key: "delete-member",
  type: "perform",
  resource: "membership",
  title: "Remove Member",
  description: "Remove a member from a space.",
  // Removing an already-removed member is a 404, but the end state is the same.
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
      key: "member",
      label: "Member",
      type: "string",
      required: true,
      hint:
        "The membership id, the member's email address, or the full resource name `spaces/{space}/members/{member}` — a full name here overrides Space.",
      placeholder: "person@example.com",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Membership resource name" },
    { key: "state", type: "string", label: "Membership state" },
    { key: "member", type: "object", label: "Removed member" },
  ],

  async execute(input, ctx) {
    const client = new GoogleChatClient(ctx);
    return await client.request(`/${membershipName(input.space, input.member)}`, {
      method: "DELETE",
    });
  },
};

export default deleteMember;
