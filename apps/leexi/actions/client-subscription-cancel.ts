import type { ActionDefinition } from "@w6w/types";
import { LeexiClient, seg } from "../lib/client.ts";

interface Input {
  company_uuid: string;
}

/** `DELETE /reseller/companies/{company_uuid}/subscription` */
const clientSubscriptionCancel: ActionDefinition<Input> = {
  key: "client-subscription-cancel",
  type: "perform",
  resource: "client-subscription",
  title: "Cancel Client Subscription",
  description: "Reseller only: end a client's trial or cancel its paid subscription.",
  idempotent: false,
  params: [
    {
      key: "company_uuid",
      label: "Client company UUID",
      type: "string",
      required: true,
      hint: "UUID of one of your client companies.",
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
      `/reseller/companies/${seg(input.company_uuid)}/subscription`,
    );
    return { data: res.data ?? null, message: res.message ?? null };
  },
};

export default clientSubscriptionCancel;
