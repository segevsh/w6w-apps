import type { ActionDefinition } from "@w6w/types";
import { PrintavoClient } from "../lib/client.ts";
import { ORDER_DETAIL_FIELDS } from "../lib/fields.ts";

interface Input {
  id: string;
}

const invoiceGet: ActionDefinition<Input> = {
  key: "invoice-get",
  type: "read",
  resource: "invoice",
  title: "Get Invoice",
  description: "Fetch one invoice by ID, with notes, addresses and document URLs.",
  params: [
    { key: "id", label: "Invoice ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<Record<string, unknown>>(
      `query($id: ID!) { invoice(id: $id) { ${ORDER_DETAIL_FIELDS} } }`,
      { id: input.id },
    );
    return data.invoice;
  },
};

export default invoiceGet;
