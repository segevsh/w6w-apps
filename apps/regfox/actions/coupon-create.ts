import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, RegfoxClient, toList } from "../lib/client.ts";

/** `POST /v2/public/coupons` */
const couponCreate: ActionDefinition<Record<string, unknown>> = {
  key: "coupon-create",
  type: "perform",
  resource: "coupon",
  title: "Create Coupon",
  description: "Create a coupon with one or more codes. Each call creates a new coupon; the " +
    "vendor accepts no idempotency key.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "currency",
      label: "Currency",
      type: "string",
      required: true,
      default: "USD",
      hint: "ISO code: USD, CAD, AUD, NZD, GBP, ...",
    },
    {
      key: "available",
      label: "Available uses",
      type: "number",
      required: true,
      hint: "Number of coupons available; -1 means unlimited.",
      validation: { integer: true },
    },
    {
      key: "productId",
      label: "Product",
      type: "select",
      required: true,
      default: "4",
      options: [
        { value: "4", label: "RegFox" },
        { value: "5", label: "TicketSpice" },
        { value: "3", label: "RedPodium" },
        { value: "2", label: "GivingFuel" },
      ],
    },
    {
      key: "formId",
      label: "Form ID",
      type: "number",
      hint: "Restrict the coupon to one form. Leave empty for a global coupon.",
      validation: { integer: true },
    },
    {
      key: "codes",
      label: "Codes",
      type: "string",
      required: true,
      hint: "Comma-separated coupon codes.",
    },
    {
      key: "discounts",
      label: "Discounts (JSON)",
      type: "json",
      required: true,
      hint: 'Array such as [{"value":"10","valueType":"fixed","perTicket":false}]. The vendor ' +
        "describes valueType as Fixed or Percentage; its own example sends `fixed`.",
    },
    {
      key: "expires",
      label: "Expires",
      type: "string",
      hint: "ISO 8601 timestamp, e.g. 2026-12-31T23:59:59Z.",
    },
  ],
  output: [{ key: "coupon", type: "object", label: "The created coupon" }],
  async execute(input, ctx) {
    const codes = toList(input.codes).map((code) => ({ code }));
    if (codes.length === 0) throw new Error("at least one coupon code is required");
    const discounts = asOptionalJson<unknown[]>(input.discounts, "discounts");
    if (!Array.isArray(discounts) || discounts.length === 0) {
      throw new Error("discounts must be a non-empty JSON array");
    }
    const body: Record<string, unknown> = {
      name: input.name,
      currency: input.currency,
      available: Number(input.available),
      productId: Number(input.productId),
      discounts,
      codes,
    };
    if (input.formId !== undefined && input.formId !== null && input.formId !== "") {
      body.formId = Number(input.formId);
    }
    if (input.expires) body.expires = input.expires;
    const res = await new RegfoxClient(ctx).call("/coupons", { method: "POST", body });
    return { coupon: res.data };
  },
};

export default couponCreate;
