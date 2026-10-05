import type { ActionDefinition } from "@w6w/types";
import { compact, MightyClient, seg } from "../lib/client.ts";

/** `PATCH /members/{id}/` under `/admin/v1/networks/{network_id}` — the Network comes from the Connection. */
interface Input {
  id: number;
  role?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

const memberUpdate: ActionDefinition<Input> = {
  key: "member-update",
  type: "perform",
  resource: "member",
  title: "Update Member",
  description: "Change a member's role, email or name.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Member ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "role",
      label: "Role",
      type: "select",
      options: [{ value: "host", label: "Host" }, { value: "moderator", label: "Moderator" }, {
        value: "contributor",
        label: "Contributor",
      }],
    },
    { key: "email", label: "Email", type: "string" },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
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
    return new MightyClient(ctx).request(`/members/${seg(input.id)}/`, {
      method: "PATCH",
      body: compact({
        role: input.role,
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
      }),
    });
  },
};

export default memberUpdate;
