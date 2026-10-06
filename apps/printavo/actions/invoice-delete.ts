import type { ActionDefinition } from "@w6w/types";
import { PrintavoClient } from "../lib/client.ts";

interface Input {
  id: string;
}

const invoiceDelete: ActionDefinition<Input> = {
  key: "invoice-delete",
  type: "perform",
  resource: "invoice",
  title: "Delete Invoice",
  description: "Delete an invoice (invoiceDelete).",
  idempotent: true,
  params: [
    { key: "id", label: "Invoice ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Deleted ID" },
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<Record<string, { id: string }>>(
      `mutation($id: ID!) { invoiceDelete(id: $id) { id } }`,
      { id: input.id },
    );
    return data.invoiceDelete;
  },
};

export default invoiceDelete;
