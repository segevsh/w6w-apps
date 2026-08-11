import type { ActionDefinition } from "@w6w/types";
import { asJson, BigCommerceClient } from "../lib/client.ts";

/**
 * `POST /v3/customers` — create customers.
 *
 * **The body is a JSON ARRAY, not an object**, and there is no
 * `/v3/customers/{id}` path at all: v3 Customers is a batch-only collection.
 * Posting a single customer object rather than a one-element array is the most
 * common way this endpoint 422s, and it is not obvious from the endpoint's name.
 *
 * Vendor limits and requirements, from the operation's own description:
 *
 *  - **Up to 10 customers per call.**
 *  - `email`, `first_name` and `last_name` are required on each.
 *  - An embedded `addresses` entry additionally requires `first_name`,
 *    `last_name`, `address1`, `city` and `country_code`.
 *  - Any `attributes` must already exist — they are created through a separate
 *    endpoint *before* the customer, not inline.
 *  - The success status is **200**, not 201.
 */
interface Input {
  customers: unknown;
}

const customerCreate: ActionDefinition<Input> = {
  key: "customer-create",
  type: "perform",
  resource: "customer",
  title: "Create Customers",
  description: "Create up to 10 customers in one call. The body is an array, even for one.",
  // BigCommerce mints the ids and offers no idempotency key; a retry creates
  // duplicates (or 422s on a duplicate email, which is not a safe assumption).
  idempotent: false,
  params: [
    {
      key: "customers",
      label: "Customers",
      type: "json",
      required: true,
      placeholder: '[{ "email": "jane@example.com", "first_name": "Jane", "last_name": "Doe" }]',
      hint: "An ARRAY of customer objects — up to 10. Each needs email, first_name and last_name.",
    },
  ],
  output: [{ key: "data", type: "array", label: "Created customers" }],

  async execute(input, ctx) {
    const body = asJson<unknown>(input.customers, "Customers");
    if (!Array.isArray(body)) {
      throw new Error(
        "BigCommerce's Create Customers endpoint takes a JSON array — wrap a single customer in " +
          "[ ] rather than sending the object on its own.",
      );
    }
    if (body.length > 10) {
      throw new Error(
        `BigCommerce accepts at most 10 customers per call; got ${body.length}. Split the batch.`,
      );
    }
    return await new BigCommerceClient(ctx).v3("/customers", { method: "POST", body });
  },
};

export default customerCreate;
