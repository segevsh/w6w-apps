import type { ActionDefinition } from "@w6w/types";
import { PrintavoClient } from "../lib/client.ts";
import { ORDER_FIELDS } from "../lib/fields.ts";

interface Input {
  id: string;
}

const invoiceDuplicate: ActionDefinition<Input> = {
  key: "invoice-duplicate",
  type: "perform",
  resource: "invoice",
  title: "Duplicate Invoice",
  description:
    "Create a copy of a invoice (`invoiceDuplicate`). Not idempotent: every call makes another copy.",
  idempotent: false,
  params: [
    { key: "id", label: "Invoice ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "New ID" },
    { key: "visualId", type: "string", label: "Invoice #" },
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<{ invoiceDuplicate: unknown }>(
      `mutation($id: ID!) { invoiceDuplicate(id: $id) { ${ORDER_FIELDS} } }`,
      { id: input.id },
    );
    return data.invoiceDuplicate;
  },
};

export default invoiceDuplicate;
