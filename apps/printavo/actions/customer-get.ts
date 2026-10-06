import type { ActionDefinition } from "@w6w/types";
import { PrintavoClient } from "../lib/client.ts";
import { CUSTOMER_FIELDS } from "../lib/fields.ts";

interface Input {
  id: string;
}

const customerGet: ActionDefinition<Input> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Fetch one customer by ID.",
  params: [
    { key: "id", label: "Customer ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<Record<string, unknown>>(
      `query($id: ID!) { customer(id: $id) { ${CUSTOMER_FIELDS} } }`,
      { id: input.id },
    );
    return data.customer;
  },
};

export default customerGet;
