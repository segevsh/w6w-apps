import type { ActionDefinition } from "@w6w/types";
import { compact, LeexiClient, seg } from "../lib/client.ts";

interface Input {
  company_uuid: string;
  uuid: string;
  name?: string;
  active?: boolean;
}

/** `PATCH /reseller/companies/{company_uuid}/teams/{uuid}` */
const clientTeamUpdate: ActionDefinition<Input> = {
  key: "client-team-update",
  type: "perform",
  resource: "client-team",
  title: "Update Client Team",
  description: "Reseller only: update a team of a client company.",
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
      label: "Team UUID",
      type: "string",
      required: true,
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      hint: "Must be unique within the workspace.",
    },
    {
      key: "active",
      label: "Active",
      type: "boolean",
      hint:
        "Defaults to true on creation. A team can only be deactivated once it has no active users.",
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
      `/reseller/companies/${seg(input.company_uuid)}/teams/${seg(input.uuid)}`,
      {
        body: compact({ name: input.name, active: input.active }),
      },
    );
    return { data: res.data ?? null, message: res.message ?? null };
  },
};

export default clientTeamUpdate;
