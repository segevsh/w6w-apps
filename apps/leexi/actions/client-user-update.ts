import type { ActionDefinition } from "@w6w/types";
import { compact, LeexiClient, seg, strList } from "../lib/client.ts";

interface Input {
  company_uuid: string;
  uuid: string;
  name?: string;
  email?: string;
  team_uuid?: string;
  license?: string;
  roles?: string[] | string;
  active?: boolean;
}

/** `PATCH /reseller/companies/{company_uuid}/users/{uuid}` */
const clientUserUpdate: ActionDefinition<Input> = {
  key: "client-user-update",
  type: "perform",
  resource: "client-user",
  title: "Update Client User",
  description: "Reseller only: update a user of a client company.",
  idempotent: true,
  params: [
    {
      key: "company_uuid",
      label: "Client company UUID",
      type: "string",
      required: true,
      hint: "UUID of one of your client companies.",
    },
    {
      key: "uuid",
      label: "User UUID",
      type: "string",
      required: true,
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      hint: "The user's full name.",
    },
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Must be deliverable and not already used in any Leexi company.",
    },
    {
      key: "team_uuid",
      label: "Team UUID",
      type: "string",
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
      hint: 'Role names; defaults to ["member"] on creation.',
    },
    {
      key: "active",
      label: "Active",
      type: "boolean",
      hint: "Set to false to deactivate the user.",
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
      "PATCH",
      `/reseller/companies/${seg(input.company_uuid)}/users/${seg(input.uuid)}`,
      {
        body: compact({
          name: input.name,
          email: input.email,
          team_uuid: input.team_uuid,
          license: input.license,
          roles: strList(input.roles),
          active: input.active,
        }),
      },
    );
    return { data: res.data ?? null, message: res.message ?? null };
  },
};

export default clientUserUpdate;
