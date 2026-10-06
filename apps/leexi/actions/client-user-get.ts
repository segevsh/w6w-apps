import type { ActionDefinition } from "@w6w/types";
import { LeexiClient, seg } from "../lib/client.ts";

interface Input {
  company_uuid: string;
  uuid: string;
}

/** `GET /reseller/companies/{company_uuid}/users/{uuid}` */
const clientUserGet: ActionDefinition<Input> = {
  key: "client-user-get",
  type: "read",
  resource: "client-user",
  title: "Get Client User",
  description: "Reseller only: retrieve one user of a client company.",
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
      "GET",
      `/reseller/companies/${seg(input.company_uuid)}/users/${seg(input.uuid)}`,
    );
    return { data: res.data ?? null, message: res.message ?? null };
  },
};

export default clientUserGet;
