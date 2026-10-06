import type { ActionDefinition } from "@w6w/types";
import { AlegraClient, idPath } from "../lib/client.ts";

interface Input {
  id: string;
}

const invoiceDelete: ActionDefinition<Input> = {
  key: "invoice-delete",
  type: "perform",
  resource: "invoice",
  title: "Delete Draft Invoice",
  description:
    "Delete a sales invoice. Only invoices in draft status can be deleted; use Void Sales Invoice otherwise.",
  idempotent: false,
  params: [
    { key: "id", label: "ID", type: "string", required: true },
  ],
  output: [{ key: "code", type: "number", label: "Vendor result code" }],

  /**
   * Success is any 2xx. Note the vendor's body is NOT a reliable success marker: Delete Item answers
   * 200 with `{"error": "El producto fue eliminado correctamente.", "code": 200}` — an `error` key
   * on a success — so the result is passed through verbatim and never inspected for `error`.
   */
  async execute(input, ctx) {
    const client = new AlegraClient(ctx);
    return await client.request(`/invoices/${idPath(input.id)}`, { method: "DELETE" });
  },
};

export default invoiceDelete;
