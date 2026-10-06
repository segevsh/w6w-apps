import type { ActionDefinition } from "@w6w/types";
import { compact, LeexiClient, seg, strList } from "../lib/client.ts";

interface Input {
  company_uuid: string;
  name: string;
  email: string;
  team_uuid: string;
  license?: string;
  roles?: string[] | string;
  active?: boolean;
  send_welcome_email?: boolean;
}

/** `POST /reseller/companies/{company_uuid}/users` */
const clientUserCreate: ActionDefinition<Input> = {
  key: "client-user-create",
  type: "perform",
  resource: "client-user",
  title: "Create Client User",
  description: "Reseller only: create a user in a client company.",
  idempotent: false,
  params: [
    {
      key: "company_uuid",
      label: "Client company UUID",
      type: "string",
      required: true,
      hint: "UUID of one of your client companies.",
    },
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
      hint: 'Role names; defaults to ["member"]. A reseller key may assign every role.',
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
    const res = await new LeexiClient(ctx).request(
      "POST",
      `/reseller/companies/${seg(input.company_uuid)}/users`,
      {
        body: compact({
          name: input.name,
          email: input.email,
          team_uuid: input.team_uuid,
          license: input.license,
          roles: strList(input.roles),
          active: input.active,
          send_welcome_email: input.send_welcome_email,
        }),
      },
    );
    return { data: res.data ?? null, message: res.message ?? null };
  },
};

export default clientUserCreate;
