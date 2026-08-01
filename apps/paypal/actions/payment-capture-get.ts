import type { ActionDefinition } from "@w6w/types";
import { PayPalClient } from "../lib/client.ts";

/** Get details for a captured payment. Wraps `GET /v2/payments/captures/{id}`. */
const action: ActionDefinition = {
  key: "payment-capture-get",
  type: "read",
  resource: "payment",
  title: "Get a captured payment",
  description: "Show details for a captured payment, by ID.",
  params: [
    { key: "captureId", label: "Capture ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Capture ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "amount", type: "object", label: "Amount ({ currency_code, value })" },
  ],

  async execute(input, ctx) {
    const captureId = String((input as Record<string, unknown>).captureId ?? "").trim();
    if (!captureId) throw new Error("`captureId` is required");
    return await new PayPalClient(ctx).request(`/v2/payments/captures/${captureId}`);
  },
};

export default action;
