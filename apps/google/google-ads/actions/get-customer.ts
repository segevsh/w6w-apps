import type { ActionDefinition } from "@w6w/types";
import { buildGaql, fieldPaths, GoogleAdsClient } from "../lib/client.ts";
import { customerId, extraFields, searchOutput } from "../lib/params.ts";

interface Input {
  customerId?: string;
  extraFields?: string;
}

/**
 * Read one account's own settings, via GAQL `FROM customer`.
 *
 * There is no `customers.get` in this API — `CustomerService` exposes only
 * `mutate`, `listAccessibleCustomers` and `createCustomerClient`. `FROM
 * customer` is how you read a customer, and it always returns exactly the
 * account the request is addressed to (no `WHERE` needed, and `LIMIT 1` is
 * therefore free).
 */
const getCustomer: ActionDefinition<Input> = {
  key: "get-customer",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description:
    "Read the account this call is addressed to — name, currency, time zone, and whether it is a manager or test account.",
  params: [customerId, extraFields],
  output: searchOutput,

  execute(input, ctx) {
    const client = new GoogleAdsClient(ctx);
    const query = buildGaql({
      select: [
        "customer.resource_name",
        "customer.id",
        "customer.descriptive_name",
        "customer.currency_code",
        "customer.time_zone",
        "customer.auto_tagging_enabled",
        "customer.manager",
        "customer.test_account",
        "customer.status",
        ...fieldPaths(input.extraFields, "extraFields"),
      ],
      from: "customer",
      limit: 1,
    });
    return client.search(client.customerId(input.customerId), { query });
  },
};

export default getCustomer;
