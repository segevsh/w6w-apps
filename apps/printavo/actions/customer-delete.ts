import type { ActionDefinition } from "@w6w/types";
import { PrintavoClient } from "../lib/client.ts";

interface Input {
  id: string;
}

const customerDelete: ActionDefinition<Input> = {
  key: "customer-delete",
  type: "perform",
  resource: "customer",
  title: "Delete Customer",
  description: "Permanently delete a customer (customerDelete).",
  idempotent: true,
  params: [
    { key: "id", label: "Customer ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Deleted ID" },
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<Record<string, { id: string }>>(
      `mutation($id: ID!) { customerDelete(id: $id) { id } }`,
      { id: input.id },
    );
    return data.customerDelete;
  },
};

export default customerDelete;
