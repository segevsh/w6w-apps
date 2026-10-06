import type { ActionDefinition } from "@w6w/types";
import { compact, LoopClient } from "../lib/client.ts";

/**
 * Create Return QR Code.
 *
 * `POST /order/qr` (Orders scope). `type` defaults to `png` when absent or unsupported.
 */
interface Input {
  name: string;
  zip: string;
  gift?: boolean;
  type?: string;
  size?: number;
}

const action: ActionDefinition<Input> = {
  key: "return-qr-create",
  type: "perform",
  resource: "return",
  title: "Create Return QR Code",
  description:
    "Create a QR code image link that opens a customer's order in Loop's returns portal.",
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
    {
      key: "type",
      label: "Image type",
      type: "select",
      hint: "QR image format. Default png.",
      options: [
        { value: "png", label: "PNG" },
        { value: "eps", label: "EPS" },
        { value: "svg", label: "SVG" },
      ],
    },
    {
      key: "size",
      label: "Size",
      type: "number",
      hint: "QR image size.",
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    { key: "qr", type: "string", label: "URL of the QR code image" },
    { key: "deeplink_url", type: "string", label: "The deep link URL" },
  ],

  async execute(input, ctx) {
    const res = await new LoopClient(ctx).post(
      "/order/qr",
      compact({
        name: input.name,
        zip: input.zip,
        gift: input.gift,
        type: input.type,
        size: input.size,
      }),
    ) as Record<string, unknown>;
    return { qr: res.qr, deeplink_url: res.deeplink_url };
  },
};

export default action;
