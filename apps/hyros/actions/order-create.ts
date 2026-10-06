import type { ActionDefinition } from "@w6w/types";
import { compact, csv, HyrosClient } from "../lib/client.ts";

interface Input {
  email?: string;
  parentEmail?: string;
  firstName?: string;
  lastName?: string;
  leadIps?: string;
  phoneNumbers?: string;
  stage?: string;
  orderId?: string;
  externalSubscriptionId?: string;
  cartId?: string;
  date?: string;
  shippingCost?: number;
  taxes?: number;
  orderDiscount?: number;
  priceFormat?: string;
  currency?: string;
  items: unknown;
}

const orderCreate: ActionDefinition<Input> = {
  key: "order-create",
  type: "perform",
  resource: "order",
  title: "Create Order",
  description:
    "Record an order (one sale per line item) and create the lead if it is not on the account yet.",
  // Without orderId Hyros assigns a fresh one, so a retry would double-count revenue.
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", hint: "Required unless a phone is given." },
    {
      key: "parentEmail",
      label: "Origin lead email",
      type: "string",
      hint: "Attribute the sale to this lead instead.",
    },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "leadIps", label: "IP addresses", type: "string", hint: "Comma-separated." },
    { key: "phoneNumbers", label: "Phone numbers", type: "string", hint: "Comma-separated." },
    { key: "stage", label: "Lead stage", type: "string" },
    {
      key: "orderId",
      label: "Order ID",
      type: "string",
      hint:
        "Groups the sales. Letters, numbers, _ - . : only. Defaults to a generated id; set it to make retries safe.",
    },
    { key: "externalSubscriptionId", label: "Subscription ID", type: "string" },
    { key: "cartId", label: "Cart ID", type: "string" },
    {
      key: "date",
      label: "Order date",
      type: "string",
      hint: "ISO 8601. Defaults to now.",
    },
    { key: "shippingCost", label: "Shipping cost", type: "number" },
    { key: "taxes", label: "Taxes", type: "number" },
    { key: "orderDiscount", label: "Order discount", type: "number" },
    {
      key: "priceFormat",
      label: "Price format",
      type: "select",
      options: [{ value: "DECIMAL", label: "Decimal" }, { value: "INTEGER", label: "Integer" }],
    },
    {
      key: "currency",
      label: "Currency",
      type: "string",
      hint: "e.g. EUR. Defaults to the account's.",
    },
    {
      key: "items",
      label: "Items",
      type: "json",
      required: true,
      hint:
        'Array of {"name","price"} plus optional quantity, externalId, costOfGoods, taxes, itemDiscount, packages, tag, categoryName.',
    },
  ],
  output: [
    { key: "requestId", type: "string", label: "Hyros request id" },
    { key: "result", type: "string", label: '"OK" on success' },
  ],

  execute(input, ctx) {
    const items = typeof input.items === "string" ? JSON.parse(input.items) : input.items;
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("items must be a non-empty array of {name, price} objects.");
    }
    const phones = csv(input.phoneNumbers);
    if (!input.email && phones.length === 0) {
      throw new Error("Hyros requires an email or at least one phone number to create an order.");
    }
    const ips = csv(input.leadIps);
    return new HyrosClient(ctx).write("POST", "/orders", {
      body: compact({
        email: input.email,
        parentEmail: input.parentEmail,
        firstName: input.firstName,
        lastName: input.lastName,
        leadIps: ips.length ? ips : undefined,
        phoneNumbers: phones.length ? phones : undefined,
        stage: input.stage,
        orderId: input.orderId,
        externalSubscriptionId: input.externalSubscriptionId,
        cartId: input.cartId,
        date: input.date,
        shippingCost: input.shippingCost,
        taxes: input.taxes,
        orderDiscount: input.orderDiscount,
        priceFormat: input.priceFormat,
        currency: input.currency,
        items,
      }),
    });
  },
};

export default orderCreate;
