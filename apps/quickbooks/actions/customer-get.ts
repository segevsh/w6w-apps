import type { ActionDefinition } from "@w6w/types";
import { QuickBooksClient } from "../lib/client.ts";
import { customerId } from "../lib/params.ts";

interface Input {
  customerId: string;
}

const customerGet: ActionDefinition<Input> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Read a single customer by Id.",
  params: [customerId],
  output: [{ key: "Customer", type: "object", label: "Customer" }],

  execute(input, ctx) {
    return new QuickBooksClient(ctx).request(
      `/customer/${encodeURIComponent(input.customerId)}`,
    );
  },
};

export default customerGet;
