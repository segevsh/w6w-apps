import type { ActionDefinition } from "@w6w/types";
import { asJson, BigCommerceClient } from "../lib/client.ts";

/**
 * `PUT /v3/customers` — update customers.
 *
 * The update goes to the **collection**, not to `/v3/customers/{id}`, which does
 * not exist. Each element must carry its own `id`, which is the only required
 * field; everything else is a partial update.
 *
 * Vendor limits, from the operation's description: **10 customers per call and 3
 * concurrent requests**. Read-only fields are `id`, `registration_ip_address`,
 * `date_created`, `date_modified` and `origin_channel_id` — sending them is
 * rejected rather than ignored. Attribute values cannot be updated here; they
 * have their own endpoint.
 */
interface Input {
  customers: unknown;
}

const customerUpdate: ActionDefinition<Input> = {
  key: "customer-update",
  type: "perform",
  resource: "customer",
  title: "Update Customers",
  description:
    "Update up to 10 customers in one call. The body is an array and each element needs its `id`.",
  idempotent: true,
  params: [
    {
      key: "customers",
      label: "Customers",
      type: "json",
      required: true,
      placeholder: '[{ "id": 12, "company": "Acme" }]',
      hint: "An ARRAY of partial customer objects, each carrying its `id`. Up to 10 per call.",
    },
  ],
  output: [{ key: "data", type: "array", label: "Updated customers" }],

  async execute(input, ctx) {
    const body = asJson<unknown>(input.customers, "Customers");
    if (!Array.isArray(body)) {
      throw new Error(
        "BigCommerce's Update Customers endpoint takes a JSON array — wrap a single customer in " +
          "[ ] rather than sending the object on its own.",
      );
    }
    if (body.length > 10) {
      throw new Error(
        `BigCommerce accepts at most 10 customers per call; got ${body.length}. Split the batch.`,
      );
    }
    const missing = body.findIndex((c) =>
      !c || typeof c !== "object" || (c as { id?: unknown }).id === undefined
    );
    if (missing >= 0) {
      throw new Error(
        `customer at index ${missing} has no \`id\` — Update Customers identifies each customer ` +
          "by an `id` in the body, not by a path segment.",
      );
    }
    return await new BigCommerceClient(ctx).v3("/customers", { method: "PUT", body });
  },
};

export default customerUpdate;
