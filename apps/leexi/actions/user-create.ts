import type { ActionDefinition } from "@w6w/types";
import { compact, LeexiClient, strList } from "../lib/client.ts";

interface Input {
  name: string;
  email: string;
  team_uuid: string;
  license?: string;
  roles?: string[] | string;
  active?: boolean;
  send_welcome_email?: boolean;
}

/** `POST /users` */
const userCreate: ActionDefinition<Input> = {
  key: "user-create",
  type: "perform",
  resource: "user",
  title: "Create User",
  description:
    "Create a user in your workspace. Billed licenses are affected, so the API key needs the write_users scope.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      hint: "The user's full name.",
    },
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      hint: "Must be deliverable and not already used in any Leexi company.",
    },
    {
      key: "team_uuid",
      label: "Team UUID",
      type: "string",
      required: true,
      hint: "The team the user belongs to. Use List Teams to find it.",
    },
    {
      key: "license",
      label: "License",
      type: "string",
      hint: "`free` or your company's own license category; anything else is ignored.",
    },
    {
      key: "roles",
      label: "Roles",
      type: "array",
      item: { type: "string" },
      hint:
        'Role names; defaults to ["member"]. Privileged roles (super_admin, system_admin, billing_manager) cannot be assigned through the API.',
    },
    {
      key: "active",
      label: "Active",
      type: "boolean",
      hint: "Defaults to true on creation.",
    },
    {
      key: "send_welcome_email",
      label: "Send welcome email",
      type: "boolean",
      hint: "Defaults to true. Set false to create the user silently.",
    },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "The record returned by Leexi (empty object for a delete)",
    },
    { key: "message", type: "string", label: "Leexi's confirmation message" },
  ],

  async execute(input, ctx) {
    const res = await new LeexiClient(ctx).request("POST", "/users", {
      body: compact({
        name: input.name,
        email: input.email,
        team_uuid: input.team_uuid,
        license: input.license,
        roles: strList(input.roles),
        active: input.active,
        send_welcome_email: input.send_welcome_email,
      }),
    });
    return { data: res.data ?? null, message: res.message ?? null };
  },
};

export default userCreate;
