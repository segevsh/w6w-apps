import type { ActionDefinition } from "@w6w/types";
import { ClockodoClient, intId } from "../lib/client.ts";

interface Input {
  id: string;
}

const getCustomer: ActionDefinition<Input> = {
  key: "get-customer",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Read one customer by id (GET /v3/customers/{id}).",
  params: [
    {
      key: "id",
      label: "Customer ID",
      type: "string",
      required: true,
    },
  ],
  output: [
    { key: "data", type: "object", label: "Customer" },
  ],

  async execute(input, ctx) {
    const id = intId(input.id, "id");
    const body = await new ClockodoClient(ctx).call(`/v3/customers/${id}`);
    return { data: body.data ?? null };
  },
};

export default getCustomer;
