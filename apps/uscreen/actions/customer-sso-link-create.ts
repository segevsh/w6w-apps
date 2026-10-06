import type { ActionDefinition } from "@w6w/types";
import { seg, UscreenClient } from "../lib/client.ts";
import { CUSTOMER_ID } from "../lib/params.ts";

interface Input {
  customerId: string;
}

const customerSsoLinkCreate: ActionDefinition<Input> = {
  key: "customer-sso-link-create",
  type: "perform",
  resource: "customer",
  title: "Create Single Sign-On Link",
  description: "Generate a single-sign-on URL that logs the customer into the storefront.",
  idempotent: false,
  params: [
    CUSTOMER_ID(""),
  ],
  output: [
    { key: "url", type: "string", label: "The single-sign-on URL" },
  ],

  async execute(input, ctx) {
    return (await new UscreenClient(ctx).call<Record<string, unknown>>(
      "POST",
      `/customers/${seg(input.customerId)}/tokenized_url`,
      {},
    )) ?? {};
  },
};

export default customerSsoLinkCreate;
