import type { ActionDefinition } from "@w6w/types";
import { LeexiClient, seg } from "../lib/client.ts";

interface Input {
  uuid: string;
}

/** `DELETE /reseller/companies/{uuid}` */
const clientCompanyDeactivate: ActionDefinition<Input> = {
  key: "client-company-deactivate",
  type: "perform",
  resource: "client-company",
  title: "Deactivate Client Company",
  description:
    "Reseller only: deactivate a client company (cancels its subscription and deactivates every user).",
  idempotent: true,
  params: [
    {
      key: "uuid",
      label: "Client company UUID",
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
      `/reseller/companies/${seg(input.uuid)}`,
    );
    return { data: res.data ?? null, message: res.message ?? null };
  },
};

export default clientCompanyDeactivate;
