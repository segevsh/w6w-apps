import type { ActionDefinition } from "@w6w/types";
import { SquareClient } from "../lib/client.ts";

interface Input {
  customerId: string;
}

/** `GET /v2/customers/{customer_id}` (RetrieveCustomer). */
const customerGet: ActionDefinition<Input> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Retrieve one customer profile by id.",
  params: [
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      required: true,
      placeholder: "JDKYHBWT1D4F8MFH63DBMEN8Y4",
    },
  ],
  output: [
    { key: "customer", type: "object", label: "Customer" },
    { key: "errors", type: "array", label: "Errors reported alongside a 2xx" },
  ],

  execute(input, ctx) {
    return new SquareClient(ctx).request(`/customers/${encodeURIComponent(input.customerId)}`);
  },
};

export default customerGet;
