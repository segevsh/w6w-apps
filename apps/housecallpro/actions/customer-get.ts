import type { ActionDefinition } from "@w6w/types";
import { encodeId, HousecallClient, toList } from "../lib/client.ts";
import { companyIdParam } from "../lib/params.ts";

/** `GET /customers/{customer_id}` — one customer, with their addresses inline. */
interface Input {
  customerId: string;
  expand?: string[] | string;
  companyId?: string;
}

const customerGet: ActionDefinition<Input> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description:
    "Fetch one customer by id. The response carries the customer's `addresses` array, which is " +
    "where the address id a job needs comes from.",
  params: [
    { key: "customerId", label: "Customer ID", type: "string", required: true },
    {
      key: "expand",
      label: "Expand",
      type: "multiselect",
      options: [
        { value: "attachments", label: "Attachments" },
        { value: "do_not_service", label: "Do-not-service flag" },
      ],
    },
    companyIdParam,
  ],
  output: [
    { key: "id", type: "string", label: "Customer ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "addresses", type: "array", label: "Addresses" },
    { key: "tags", type: "array", label: "Tags" },
  ],

  execute(input, ctx) {
    return new HousecallClient(ctx).json(`/customers/${encodeId(input.customerId)}`, {
      companyId: input.companyId,
      query: { expand: toList(input.expand) },
    });
  },
};

export default customerGet;
