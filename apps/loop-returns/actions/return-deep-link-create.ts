import type { ActionDefinition } from "@w6w/types";
import { LoopClient } from "../lib/client.ts";

/**
 * Create Return Deep Link.
 *
 * `POST /order/link` (Orders scope). `zip` is whatever the shop uses to identify the order — a postal code, email or phone number.
 */
interface Input {
  name: string;
  zip: string;
  gift?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "return-deep-link-create",
  type: "perform",
  resource: "return",
  title: "Create Return Deep Link",
  description: "Create a link that opens a customer's order directly in Loop's returns portal.",
  idempotent: true,
  params: [
    {
      key: "name",
      label: "Order name",
      type: "string",
      required: true,
      hint: "The commerce provider's order name (e.g. Shopify's `#1001`).",
    },
    {
      key: "zip",
      label: "Order detail (zip)",
      type: "string",
      required: true,
      hint:
        "The value that identifies the order: usually the shipping ZIP, but the shop's settings may make it the email or phone number.",
    },
    {
      key: "gift",
      label: "Gift flow",
      type: "boolean",
      hint: "Use Loop's Gift returns flow.",
    },
  ],
  output: [
    { key: "url", type: "string", label: "The deep link URL" },
  ],

  async execute(input, ctx) {
    const res = await new LoopClient(ctx).post("/order/link", {
      name: input.name,
      zip: input.zip,
      gift: input.gift,
    }) as Record<string, unknown>;
    return { url: res.url };
  },
};

export default action;
