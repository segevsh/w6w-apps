import type { ActionDefinition } from "@w6w/types";
import { WooCommerceClient } from "../lib/client.ts";

interface Input {
  orderId: string;
  status?: string;
  currency?: string;
  customerId?: number;
  customerNote?: string;
  paymentMethod?: string;
  paymentMethodTitle?: string;
  billing?: Record<string, unknown>;
  shipping?: Record<string, unknown>;
}

interface OrderBody {
  status?: string;
  currency?: string;
  customer_id?: number;
  customer_note?: string;
  payment_method?: string;
  payment_method_title?: string;
  billing?: Record<string, unknown>;
  shipping?: Record<string, unknown>;
}

const orderUpdate: ActionDefinition<Input> = {
  key: "order-update",
  type: "perform",
  resource: "order",
  title: "Update Order",
  description: "Update fields on an existing order (commonly its status).",
  idempotent: true,
  params: [
    { key: "orderId", label: "Order ID", type: "string", required: true },
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
    },
    { key: "currency", label: "Currency", type: "string" },
    { key: "customerId", label: "Customer ID", type: "number" },
    { key: "customerNote", label: "Customer Note", type: "text" },
    { key: "paymentMethod", label: "Payment Method ID", type: "string" },
    { key: "paymentMethodTitle", label: "Payment Method Title", type: "string" },
    { key: "billing", label: "Billing Address", type: "json" },
    { key: "shipping", label: "Shipping Address", type: "json" },
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
    if (input.billing !== undefined) body.billing = input.billing;
    if (input.shipping !== undefined) body.shipping = input.shipping;
    return client.request(`/orders/${input.orderId}`, { method: "PUT", body });
  },
};

export default orderUpdate;
