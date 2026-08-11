import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, HousecallClient } from "../lib/client.ts";
import { companyIdParam } from "../lib/params.ts";

/**
 * `POST /customers/{customer_id}/addresses` — add a service address.
 *
 * The five required fields below are the reference's own `required` list;
 * `country` is on it, which is easy to miss when every test address is domestic.
 * The returned `id` is what Create Job needs as its `address_id`.
 */
interface Input {
  customerId: string;
  street: string;
  streetLine2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  companyId?: string;
}

const customerAddressCreate: ActionDefinition<Input> = {
  key: "customer-address-create",
  type: "perform",
  resource: "customer",
  title: "Create Customer Address",
  description:
    "Add an address to a customer. The id it returns is the `address_id` Create Job requires.",
  // No dedupe key and no uniqueness constraint: a retry adds a second identical
  // address to the customer.
  idempotent: false,
  params: [
    { key: "customerId", label: "Customer ID", type: "string", required: true },
    { key: "street", label: "Street", type: "string", required: true },
    { key: "streetLine2", label: "Street line 2", type: "string" },
    { key: "city", label: "City", type: "string", required: true },
    { key: "state", label: "State", type: "string", required: true },
    { key: "zip", label: "ZIP", type: "string", required: true },
    {
      key: "country",
      label: "Country",
      type: "string",
      required: true,
      hint: "Required by the API, not optional.",
    },
    companyIdParam,
  ],
  output: [
    { key: "id", type: "string", label: "Address ID" },
    { key: "type", type: "string", label: "Address type (billing or service)" },
  ],

  execute(input, ctx) {
    return new HousecallClient(ctx).json(
      `/customers/${encodeId(input.customerId)}/addresses`,
      {
        method: "POST",
        companyId: input.companyId,
        body: compact({
          street: input.street,
          street_line_2: input.streetLine2,
          city: input.city,
          state: input.state,
          zip: input.zip,
          country: input.country,
        }),
      },
    );
  },
};

export default customerAddressCreate;
