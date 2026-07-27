import type { ActionDefinition } from "@w6w/types";
import { WooCommerceClient } from "../lib/client.ts";

interface LineItem {
  product_id?: number;
  variation_id?: number;
  quantity?: number;
  [k: string]: unknown;
}

interface Input {
  status?: string;
  currency?: string;
  customerId?: number;
  customerNote?: string;
  paymentMethod?: string;
  paymentMethodTitle?: string;
  setPaid?: boolean;
  billing?: Record<string, unknown>;
  shipping?: Record<string, unknown>;
  lineItems?: LineItem[];
}

interface OrderBody {
  status?: string;
  currency?: string;
  customer_id?: number;
  customer_note?: string;
  payment_method?: string;
  payment_method_title?: string;
  set_paid?: boolean;
  billing?: Record<string, unknown>;
  shipping?: Record<string, unknown>;
  line_items?: LineItem[];
}

const orderCreate: ActionDefinition<Input> = {
  key: "order-create",
  type: "perform",
  resource: "order",
  title: "Create Order",
  description: "Create a new order.",
  idempotent: false,
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "pending", label: "Pending" },
        { value: "processing", label: "Processing" },
        { value: "on-hold", label: "On Hold" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
        { value: "refunded", label: "Refunded" },
        { value: "failed", label: "Failed" },
      ],
      default: "pending",
    },
    { key: "currency", label: "Currency", type: "string", hint: "ISO 4217 code, e.g. USD." },
    { key: "customerId", label: "Customer ID", type: "number", hint: "0 for a guest order." },
    { key: "customerNote", label: "Customer Note", type: "text" },
    { key: "paymentMethod", label: "Payment Method ID", type: "string" },
    { key: "paymentMethodTitle", label: "Payment Method Title", type: "string" },
    {
      key: "setPaid",
      label: "Set Paid",
      type: "boolean",
      default: false,
      hint: "Mark the order paid — sets status to processing and reduces stock.",
    },
    {
      key: "billing",
      label: "Billing Address",
      type: "json",
      hint: "Object with first_name, last_name, address_1, city, postcode, country, email, phone…",
    },
    {
      key: "shipping",
      label: "Shipping Address",
      type: "json",
      hint: "Object with first_name, last_name, address_1, city, postcode, country…",
    },
    {
      key: "lineItems",
      label: "Line Items",
      type: "json",
      hint: "Array of `{ product_id, quantity, variation_id? }` objects.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Order ID" },
    { key: "number", type: "string", label: "Order Number" },
    { key: "status", type: "string", label: "Status" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "total", type: "string", label: "Total" },
    { key: "customer_id", type: "number", label: "Customer ID" },
    { key: "payment_method", type: "string", label: "Payment Method" },
    { key: "line_items", type: "array", label: "Line Items" },
    { key: "date_created", type: "string", label: "Date Created" },
  ],

  execute(input, ctx) {
    const client = WooCommerceClient.fromConnection(ctx);
    const body: OrderBody = {};
    if (input.status !== undefined) body.status = input.status;
    if (input.currency !== undefined) body.currency = input.currency;
    if (input.customerId !== undefined) body.customer_id = input.customerId;
    if (input.customerNote !== undefined) body.customer_note = input.customerNote;
    if (input.paymentMethod !== undefined) body.payment_method = input.paymentMethod;
    if (input.paymentMethodTitle !== undefined) {
      body.payment_method_title = input.paymentMethodTitle;
    }
    if (input.setPaid !== undefined) body.set_paid = input.setPaid;
    if (input.billing !== undefined) body.billing = input.billing;
    if (input.shipping !== undefined) body.shipping = input.shipping;
    if (input.lineItems !== undefined) body.line_items = input.lineItems;
    return client.request("/orders", { method: "POST", body });
  },
};

export default orderCreate;
