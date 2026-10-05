import type { ActionDefinition } from "@w6w/types";
import { intId, SamCartClient } from "../lib/client.ts";

/** `GET /v1/customers/{customerId}/addresses` */
interface Input {
  customerId: number;
}

const customerAddressList: ActionDefinition<Input> = {
  key: "customer-address-list",
  type: "read",
  resource: "customer",
  title: "List Customer Addresses",
  description: "A customer's addresses.",
  params: [
    {
      "key": "customerId",
      "label": "Customer ID",
      "type": "number",
      "required": true,
      "validation": {
        "integer": true,
        "min": 1,
      },
    },
  ],
  output: [
    {
      "key": "data",
      "type": "array",
      "label": "The returned records",
    },
  ],

  async execute(input, ctx) {
    const body = await new SamCartClient(ctx).call(
      "GET",
      `/customers/${intId(input.customerId, "Customer ID")}/addresses`,
    );
    return { data: Array.isArray(body) ? body : [] };
  },
};

export default customerAddressList;
