import type { ActionDefinition } from "@w6w/types";
import { compact, idList, MightyClient } from "../lib/client.ts";

/** `POST /members` under `/admin/v1/networks/{network_id}` — the Network comes from the Connection. */
interface Input {
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
  memberType?: string;
  spaceIds?: string;
  sendWelcomeEmail?: boolean;
}

const memberCreate: ActionDefinition<Input> = {
  key: "member-create",
  type: "perform",
  resource: "member",
  title: "Create Member",
  description: "Add a person to the Network, optionally as a limited member of specific spaces.",
  idempotent: false,
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      hint: "The new member's email address.",
    },
    { key: "firstName", label: "First name", type: "string", required: true },
    { key: "lastName", label: "Last name", type: "string", required: true },
    {
      key: "role",
      label: "Role",
      type: "select",
      hint: "Defaults to 'contributor'.",
      options: [{ value: "host", label: "Host" }, { value: "moderator", label: "Moderator" }, {
        value: "contributor",
        label: "Contributor",
      }],
    },
    {
      key: "memberType",
      label: "Member type",
      type: "select",
      hint:
        "'full' (default) joins the whole Network; 'limited' joins only the spaces listed below.",
      options: [{ value: "full", label: "Full" }, { value: "limited", label: "Limited" }],
    },
    {
      key: "spaceIds",
      label: "Space IDs",
      type: "string",
      hint: "Comma-separated space ids. Required when member type is 'limited', ignored otherwise.",
    },
    {
      key: "sendWelcomeEmail",
      label: "Send welcome email",
      type: "boolean",
      hint: "Defaults to true.",
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
    return new MightyClient(ctx).request("/members", {
      method: "POST",
      body: compact({
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
        role: input.role,
        member_type: input.memberType,
        space_ids: idList(input.spaceIds),
        send_welcome_email: input.sendWelcomeEmail,
      }),
    });
  },
};

export default memberCreate;
