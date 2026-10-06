import type { ActionDefinition } from "@w6w/types";
import { seg, UscreenClient } from "../lib/client.ts";
import { CUSTOMER_ID } from "../lib/params.ts";

interface Input {
  customerId: string;
  accessId: string;
}

const accessGet: ActionDefinition<Input> = {
  key: "access-get",
  type: "read",
  resource: "access",
  title: "Get Customer Access",
  description: "Fetch one access record for a customer.",
  params: [
    CUSTOMER_ID(""),
    { "key": "accessId", "label": "Access ID", "type": "string", "required": true },
  ],
  output: [
    { key: "id", type: "number", label: "Record id (the full vendor object is returned)" },
  ],

  async execute(input, ctx) {
    return (await new UscreenClient(ctx).call<Record<string, unknown>>(
      "GET",
      `/customers/${seg(input.customerId)}/accesses/${seg(input.accessId)}`,
      {},
    )) ?? {};
  },
};

export default accessGet;
