import type { ActionDefinition } from "@w6w/types";
import { AlegraClient, idPath } from "../lib/client.ts";

interface Input {
  id: string;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description:
    "Delete a contact. Refused (error 1015) while recurring invoices or payments reference it.",
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
    return await client.request(`/contacts/${idPath(input.id)}`, { method: "DELETE" });
  },
};

export default contactDelete;
