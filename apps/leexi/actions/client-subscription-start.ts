import type { ActionDefinition } from "@w6w/types";
import { LeexiClient, seg } from "../lib/client.ts";

interface Input {
  company_uuid: string;
}

/** `POST /reseller/companies/{company_uuid}/subscription` */
const clientSubscriptionStart: ActionDefinition<Input> = {
  key: "client-subscription-start",
  type: "perform",
  resource: "client-subscription",
  title: "Start Client Subscription",
  description:
    "Reseller only: end the client's Leexi trial and start its paid Stripe subscription using the plan set on the company. 422 when billing goes through Leexi; 409 when a subscription is already open.",
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
      "POST",
      `/reseller/companies/${seg(input.company_uuid)}/subscription`,
    );
    return { data: res.data ?? null, message: res.message ?? null };
  },
};

export default clientSubscriptionStart;
