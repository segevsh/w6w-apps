import type { ActionDefinition } from "@w6w/types";
import { MightyClient, seg } from "../lib/client.ts";

/** `POST /spaces/{space_id}/members` under `/admin/v1/networks/{network_id}` — the Network comes from the Connection. */
interface Input {
  spaceId: number;
  userId: number;
}

const spaceMemberAdd: ActionDefinition<Input> = {
  key: "space-member-add",
  type: "perform",
  resource: "space-member",
  title: "Add Member to Space",
  description: "Add an existing member (by user id) to a space.",
  idempotent: true,
  params: [
    {
      key: "spaceId",
      label: "Space ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "userId",
      label: "User ID",
      type: "number",
      required: true,
      hint: "The member's user id.",
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    { key: "id", type: "number", label: "Member (user) id" },
    { key: "email", type: "string", label: "Email address" },
    { key: "member_type", type: "string", label: "'full' or 'limited'" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "time_zone", type: "string", label: "Time zone" },
    { key: "location", type: "string", label: "Location" },
    { key: "bio", type: "string", label: "Bio" },
    { key: "avatar", type: "string", label: "Avatar URL" },
    { key: "permalink", type: "string", label: "Profile URL" },
    { key: "ambassador_level", type: "string", label: "Ambassador level" },
    { key: "last_visited_at", type: "string", label: "Last visit (ISO 8601)" },
    { key: "created_at", type: "string", label: "Created (ISO 8601)" },
    { key: "updated_at", type: "string", label: "Updated (ISO 8601)" },
  ],

  execute(input, ctx) {
    return new MightyClient(ctx).request(`/spaces/${seg(input.spaceId)}/members`, {
      method: "POST",
      query: { user_id: input.userId },
    });
  },
};

export default spaceMemberAdd;
