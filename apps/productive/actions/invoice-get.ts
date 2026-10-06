import type { ActionDefinition } from "@w6w/types";
import { encodeId, ProductiveClient } from "../lib/client.ts";
import { includeParam, resourceOutput } from "../lib/params.ts";

/**
 * Get one invoice by id (`GET /invoices/{id}`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  id: string | number;
  include?: string;
}

const invoiceGet: ActionDefinition<Input> = {
  key: "invoice-get",
  type: "read",
  resource: "invoice",
  title: "Get Invoice",
  description: "Get one invoice by id (`GET /invoices/{id}`).",
  params: [
    { key: "id", label: "Invoice ID", type: "string", required: true },
    includeParam,
  ],
  output: resourceOutput("Invoice"),

  async execute(input, ctx) {
    return await new ProductiveClient(ctx).one(`/invoices/${encodeId(input.id)}`, {
      query: { include: input.include },
    });
  },
};

export default invoiceGet;
