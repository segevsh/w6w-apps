import type { ActionDefinition } from "@w6w/types";
import { LeexiClient, seg } from "../lib/client.ts";

interface Input {
  company_uuid: string;
  uuid: string;
}

/** `DELETE /reseller/companies/{company_uuid}/teams/{uuid}` */
const clientTeamDelete: ActionDefinition<Input> = {
  key: "client-team-delete",
  type: "perform",
  resource: "client-team",
  title: "Delete Client Team",
  description:
    "Reseller only: delete a team of a client company. A team that still has users answers 422.",
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
      "DELETE",
      `/reseller/companies/${seg(input.company_uuid)}/teams/${seg(input.uuid)}`,
    );
    return { data: res.data ?? null, message: res.message ?? null };
  },
};

export default clientTeamDelete;
