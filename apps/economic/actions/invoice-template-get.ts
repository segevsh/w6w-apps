import type { ActionDefinition } from "@w6w/types";
import { EconomicClient, seg } from "../lib/client.ts";

const invoiceTemplateGet: ActionDefinition<{ customerNumber: number }> = {
  key: "invoice-template-get",
  type: "read",
  resource: "invoice",
  title: "Get Customer Invoice Template",
  description:
    "Return a draft-invoice body pre-filled from a customer's defaults (payment terms, layout, recipient, VAT zone, currency). Read-only; nothing is created.",
  params: [{ key: "customerNumber", label: "Customer number", type: "number", required: true }],
  output: [{ key: "template", type: "object", label: "Pre-filled draft invoice" }],
  async execute(input, ctx) {
    const template = await new EconomicClient(ctx).request(
      "GET",
      `/customers/${seg(input.customerNumber)}/templates/invoice`,
    );
    return { template };
  },
};

export default invoiceTemplateGet;
